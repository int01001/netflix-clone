import type { HomeSections, Movie } from "./types";

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
};

type TmdbMovieDetails = TmdbMovie & {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
};

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  18: "Drama",
  14: "Fantasy",
  27: "Horror",
  9648: "Mystery",
  878: "Sci-Fi",
  53: "Thriller",
  10749: "Romance",
};

const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  thriller: 53,
  "sci-fi": 878,
  "sci fi": 878,
  scifi: 878,
  "science fiction": 878,
};

const getKey = () => {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key || key.toLowerCase().includes("your_tmdb_api_key_here")) {
    throw new Error("TMDB_API_KEY is missing or placeholder");
  }
  return key;
};

const image = (path?: string | null, size: "w500" | "w780" = "w780") =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

const yearFromDate = (date?: string) => {
  if (!date) return null;
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
};

const mapListMovie = (m: TmdbMovie): Movie => {
  const title = m.title ?? m.name ?? "Untitled";
  const release = m.release_date ?? m.first_air_date;
  const genre =
    m.genre_ids?.map((id) => GENRE_MAP[id]).find(Boolean) ?? null;

  return {
    id: m.id,
    tmdbId: m.id,
    imdbId: `tmdb:${m.id}`,
    slug: `tmdb-${m.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    tagline: null,
    genre,
    year: yearFromDate(release),
    durationMinutes: null,
    rating: typeof m.vote_average === "number" ? Number(m.vote_average.toFixed(1)) : null,
    description: m.overview ?? null,
    backdropUrl: image(m.backdrop_path, "w780"),
    thumbnailUrl: image(m.poster_path, "w500"),
    trailerUrl: null,
    featured: false,
  };
};

const mapDetailsMovie = (m: TmdbMovieDetails): Movie => {
  const base = mapListMovie(m);
  const detailGenre = m.genres?.[0]?.name ?? base.genre;
  return {
    ...base,
    genre: detailGenre ?? null,
    durationMinutes: m.runtime ?? null,
  };
};

async function tmdb<T>(path: string, params?: Record<string, string>): Promise<T> {
  const key = getKey();
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}) at ${path}`);
  }
  return res.json() as Promise<T>;
}

const dedupe = (movies: Movie[]) => {
  const seen = new Set<number>();
  return movies.filter((m) => {
    const key = m.tmdbId ?? m.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function getTmdbSections(): Promise<HomeSections> {
  const [trendingRaw, nowRaw, topRaw, popularRaw] = await Promise.allSettled([
    tmdb<{ results: TmdbMovie[] }>("/trending/movie/week"),
    tmdb<{ results: TmdbMovie[] }>("/movie/now_playing"),
    tmdb<{ results: TmdbMovie[] }>("/movie/top_rated"),
    tmdb<{ results: TmdbMovie[] }>("/movie/popular"),
  ]);

  const pick = (
    result: PromiseSettledResult<{ results: TmdbMovie[] }>,
    label: string,
  ) => {
    if (result.status === "fulfilled") {
      return dedupe((result.value.results ?? []).map(mapListMovie));
    }
    console.warn(`TMDB ${label} fetch failed`, result.reason);
    return [] as Movie[];
  };

  const trending = pick(trendingRaw, "trending");
  const newReleases = pick(nowRaw, "now_playing");
  const topRated = pick(topRaw, "top_rated");
  const popular = pick(popularRaw, "popular");

  let combined = dedupe([...trending, ...newReleases, ...topRated, ...popular]);

  // If TMDB section endpoints fail, use TMDB search as backup before seed fallback.
  if (combined.length === 0) {
    const [action, adventure, drama, scifi] = await Promise.allSettled([
      searchTmdbMovies("action", 1),
      searchTmdbMovies("adventure", 1),
      searchTmdbMovies("drama", 1),
      searchTmdbMovies("science fiction", 1),
    ]);

    const searchPick = (result: PromiseSettledResult<Movie[]>) =>
      result.status === "fulfilled" ? result.value : [];

    const searchTrending = searchPick(action);
    const searchNew = searchPick(adventure);
    const searchTop = searchPick(drama);
    const searchPopular = searchPick(scifi);

    combined = dedupe([
      ...searchTrending,
      ...searchNew,
      ...searchTop,
      ...searchPopular,
    ]);

    if (combined.length === 0) {
      throw new Error("TMDB returned no catalog data");
    }

    const featured = combined[0] ?? null;
    if (featured) featured.featured = true;

    const sciFi = combined.filter((m) =>
      (m.genre ?? "").toLowerCase().includes("sci"),
    );
    const dramaRows = combined.filter((m) =>
      (m.genre ?? "").toLowerCase().includes("drama"),
    );

    return {
      featured,
      trending: searchTrending.slice(0, 20),
      newReleases: searchNew.slice(0, 20),
      sciFi: (sciFi.length ? sciFi : searchPopular).slice(0, 20),
      drama: (dramaRows.length ? dramaRows : searchTop).slice(0, 20),
      favorites: [],
    };
  }

  const featured = combined[0] ?? null;
  if (featured) featured.featured = true;

  const sciFi = combined.filter((m) =>
    (m.genre ?? "").toLowerCase().includes("sci"),
  );
  const drama = combined.filter((m) =>
    (m.genre ?? "").toLowerCase().includes("drama"),
  );

  return {
    featured,
    trending: trending.slice(0, 20),
    newReleases: newReleases.slice(0, 20),
    sciFi: (sciFi.length ? sciFi : topRated).slice(0, 20),
    drama: (drama.length ? drama : popular).slice(0, 20),
    favorites: [],
  };
}

export async function searchTmdbMovies(
  query: string,
  page: number,
): Promise<Movie[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: TmdbMovie[] }>("/search/movie", {
    query,
    include_adult: "false",
    page: String(page),
  });
  return dedupe((data.results ?? []).map(mapListMovie));
}

export async function getTmdbMoviesByGenre(
  genre: string,
  page: number,
): Promise<Movie[]> {
  const normalized = genre.toLowerCase().trim();
  const genreId = GENRE_NAME_TO_ID[normalized];
  const label =
    normalized === "scifi" || normalized === "sci fi" || normalized === "science fiction"
      ? "Sci-Fi"
      : genre
          .split(" ")
          .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
          .join(" ");

  if (!genreId) {
    return searchTmdbMovies(`${genre} movie`, page);
  }

  const data = await tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
    include_adult: "false",
    sort_by: "popularity.desc",
    with_genres: String(genreId),
    page: String(page),
  });

  return dedupe((data.results ?? []).map(mapListMovie)).map((movie) => ({
    ...movie,
    genre: label,
  }));
}

export async function getTmdbMovieById(id: number): Promise<Movie | null> {
  if (!Number.isFinite(id)) return null;
  const data = await tmdb<TmdbMovieDetails>(`/movie/${id}`);
  return mapDetailsMovie(data);
}

export async function getTmdbMoviesByExternalIds(ids: string[]): Promise<Movie[]> {
  const tmdbIds = ids
    .map((id) => {
      const match = /^tmdb:(\d+)$/.exec(id);
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((id): id is number => Number.isFinite(id));

  const movies = await Promise.all(tmdbIds.map((id) => getTmdbMovieById(id)));
  return movies.filter((m): m is Movie => !!m);
}

export async function getTmdbTrailerWatchUrl(
  movieId: number,
): Promise<string | null> {
  const data = await tmdb<{
    results: Array<{
      key: string;
      site: string;
      type: string;
      official?: boolean;
      iso_639_1?: string;
    }>;
  }>(`/movie/${movieId}/videos`);

  const candidates = (data.results ?? [])
    .filter((v) => v.site.toLowerCase() === "youtube")
    .sort((a, b) => {
      const score = (v: typeof a) =>
        (v.official ? 100 : 0) +
        (v.type === "Trailer" ? 50 : 0) +
        (v.iso_639_1 === "en" ? 10 : 0);
      return score(b) - score(a);
    });

  const key = candidates[0]?.key;
  return key ? `https://www.youtube.com/watch?v=${key}` : null;
}
