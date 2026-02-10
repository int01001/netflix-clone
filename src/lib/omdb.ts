import { Movie } from "./types";

const API_URL = "https://www.omdbapi.com/";

const OMDB_IDS = {
  trending: ["tt4154796", "tt4633694", "tt0944947", "tt2395427", "tt10872600"],
  newReleases: ["tt1517268", "tt1016150", "tt1745960", "tt6791350", "tt15398776"],
  sciFi: ["tt1375666", "tt0133093", "tt0816692", "tt1856101", "tt0499549"],
  drama: ["tt0111161", "tt0109830", "tt0120737", "tt0167260", "tt6751668"],
};

const ensureKey = () => {
  const key = process.env.OMDB_API_KEY;
  if (!key) throw new Error("OMDB_API_KEY is missing");
  return key;
};

type OmdbMovie = {
  imdbID: string;
  Title: string;
  Year?: string;
  Runtime?: string;
  Genre?: string;
  imdbRating?: string;
  Plot?: string;
  Poster?: string;
};

const upgradePoster = (url?: string | null) => {
  if (!url || url === "N/A") return null;
  return url
    .replace(/SX\d+/i, "SX900")
    .replace(/SY\d+/i, "SY900")
    .replace(/UX\d+/i, "UX900");
};

const mapOmdbToMovie = (m: OmdbMovie): Movie => {
  const runtimeMatch = m.Runtime?.match(/(\d+)/);
  const duration = runtimeMatch ? Number(runtimeMatch[1]) : null;
  const rating = m.imdbRating ? Number(Number(m.imdbRating).toFixed(1)) : null;
  const year = m.Year ? Number.parseInt(m.Year.slice(0, 4), 10) : null;
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${m.Title} official trailer`,
  )}`;

  const numericId = Number(m.imdbID.replace("tt", "")) || Math.abs(hashCode(m.imdbID));

  return {
    id: numericId,
    imdbId: m.imdbID,
    tmdbId: numericId,
    slug: `${m.imdbID}-${m.Title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: m.Title,
    tagline: null,
    genre: m.Genre?.split(",")[0]?.trim() ?? null,
    year,
    durationMinutes: duration,
    rating,
    description: m.Plot ?? null,
    backdropUrl: upgradePoster(m.Poster),
    thumbnailUrl: upgradePoster(m.Poster),
    trailerUrl: youtubeSearch,
    featured: false,
  };
};

const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

async function fetchOmdbById(id: string): Promise<OmdbMovie | null> {
  const key = ensureKey();
  const url = `${API_URL}?apikey=${key}&i=${id}&plot=short`;
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) return null;
  const data = (await res.json()) as OmdbMovie & { Response?: string };
  if (data.Response === "False") return null;
  return data;
}

export async function getOmdbSections() {
  const sections = await Promise.all(
    Object.entries(OMDB_IDS).map(async ([key, ids]) => {
      const movies = (
        await Promise.all(ids.map((id) => fetchOmdbById(id)))
      )
        .filter(Boolean)
        .map((m) => mapOmdbToMovie(m as OmdbMovie));
      return [key, movies] as const;
    }),
  );

  const map = Object.fromEntries(sections) as Record<string, Movie[]>;

  const featured =
    map.trending?.[0] ??
    map.newReleases?.[0] ??
    map.sciFi?.[0] ??
    map.drama?.[0] ??
    null;
  if (featured) featured.featured = true;

  return {
    featured,
    trending: map.trending ?? [],
    newReleases: map.newReleases ?? [],
    sciFi: map.sciFi ?? [],
    drama: map.drama ?? [],
  };
}

export async function getOmdbMoviesByIds(ids: number[]): Promise<Movie[]> {
  const imdbIds = ids.map((n) => `tt${n}`);
  const movies = (
    await Promise.all(imdbIds.map((id) => fetchOmdbById(id)))
  ).filter(Boolean) as OmdbMovie[];
  return movies.map(mapOmdbToMovie);
}
