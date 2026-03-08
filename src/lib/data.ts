import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { verifySession } from "./auth";
import { execute, query } from "./db";
import { getTmdbMoviesByExternalIds, getTmdbSections } from "./tmdb";
import type { HomeSections, Movie, User } from "./types";

type WatchHistoryRow = {
  movie_id: number | null;
  imdb_id: string | null;
  position_seconds: number;
  duration_seconds: number;
};

type MovieRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  genre: string | null;
  year: number | null;
  duration_minutes: number | null;
  rating: number | null;
  description: string | null;
  backdrop_url: string | null;
  thumbnail_url: string | null;
  trailer_url: string | null;
  featured: number | boolean;
};

const mapMovieRow = (row: MovieRow): Movie => ({
  id: row.id,
  imdbId: null,
  tmdbId: null,
  slug: row.slug,
  title: row.title,
  tagline: row.tagline,
  genre: row.genre,
  year: row.year,
  durationMinutes: row.duration_minutes,
  rating: row.rating == null ? null : Number(row.rating),
  description: row.description,
  backdropUrl: row.backdrop_url,
  thumbnailUrl: row.thumbnail_url,
  trailerUrl: row.trailer_url,
  featured: Boolean(row.featured),
});

const emptySections = (favorites?: Movie[], continueWatching?: Movie[]): HomeSections => ({
  featured: null,
  trending: [],
  newReleases: [],
  sciFi: [],
  drama: [],
  continueWatching,
  favorites,
});

export async function getCurrentUser(): Promise<User | null> {
  noStore();
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  try {
    const users = await query<User[]>(
      "SELECT id, name, email, avatar_url AS avatarUrl FROM users WHERE id = ? LIMIT 1",
      [payload.userId],
    );
    return users[0] ?? null;
  } catch (error) {
    console.error("Failed to load user from database", error);
    return null;
  }
}

export async function getFavorites(userId: number): Promise<Movie[]> {
  noStore();

  const favs = await query<{ imdb_id: string | null }[]>(
    "SELECT imdb_id FROM favorites WHERE user_id = ? AND imdb_id IS NOT NULL",
    [userId],
  );

  const externalIds = favs
    .map((favorite) => favorite.imdb_id)
    .filter((id): id is string => !!id);

  if (!externalIds.length) return [];

  return getTmdbMoviesByExternalIds(externalIds);
}

export async function getContinueWatching(userId: number): Promise<Movie[]> {
  noStore();

  const rows = await query<WatchHistoryRow[]>(
    `SELECT movie_id, imdb_id, position_seconds, duration_seconds
     FROM watch_history
     WHERE user_id = ? AND position_seconds > 0
     ORDER BY last_watched_at DESC
     LIMIT 18`,
    [userId],
  );

  if (!rows.length) return [];

  const externalIds: string[] = [];
  const localMovieIds: number[] = [];

  rows.forEach((row) => {
    if (row.imdb_id && !externalIds.includes(row.imdb_id)) {
      externalIds.push(row.imdb_id);
    }
    if (row.movie_id && !localMovieIds.includes(row.movie_id)) {
      localMovieIds.push(row.movie_id);
    }
  });

  let tmdbMovies: Movie[] = [];
  if (externalIds.length) {
    try {
      tmdbMovies = await getTmdbMoviesByExternalIds(externalIds);
    } catch (error) {
      console.error("Failed to load continue-watching TMDB titles", error);
    }
  }

  let localMovies: Movie[] = [];
  if (localMovieIds.length) {
    const placeholders = localMovieIds.map(() => "?").join(", ");
    const localRows = await query<MovieRow[]>(
      `SELECT id, slug, title, tagline, genre, year, duration_minutes, rating, description, backdrop_url, thumbnail_url, trailer_url, featured
       FROM movies
       WHERE id IN (${placeholders})`,
      localMovieIds,
    );
    localMovies = localRows.map(mapMovieRow);
  }

  const tmdbMap = new Map(tmdbMovies.map((movie) => [movie.imdbId ?? "", movie]));
  const localMap = new Map(localMovies.map((movie) => [movie.id, movie]));

  const seen = new Set<string | number>();
  const ordered: Movie[] = [];

  rows.forEach((row) => {
    const sourceMovie = row.imdb_id
      ? tmdbMap.get(row.imdb_id)
      : row.movie_id
        ? localMap.get(row.movie_id)
        : null;

    if (!sourceMovie) return;

    const key = sourceMovie.imdbId ?? sourceMovie.id;
    if (seen.has(key)) return;
    seen.add(key);

    ordered.push({
      ...sourceMovie,
      progressSeconds: row.position_seconds,
      durationSeconds: row.duration_seconds,
    });
  });

  return ordered;
}

export async function getHomeSections(userId?: number): Promise<HomeSections> {
  const [favorites, continueWatching] = userId
    ? await Promise.all([getFavorites(userId), getContinueWatching(userId)])
    : [undefined, undefined];

  try {
    const tmdbSections = await getTmdbSections();
    return { ...tmdbSections, favorites, continueWatching };
  } catch (error) {
    console.error("TMDB catalog unavailable", error);
    return emptySections(favorites, continueWatching);
  }
}

export async function toggleFavorite(
  userId: number,
  movieId?: number,
  imdbId?: string,
): Promise<{ favorite: boolean }> {
  const column = imdbId ? "imdb_id" : "movie_id";
  const value = imdbId ?? movieId;

  if (!value) throw new Error("movieId or imdbId required");

  const existing = await query<{ id: number }[]>(
    `SELECT id FROM favorites WHERE user_id = ? AND ${column} = ? LIMIT 1`,
    [userId, value],
  );

  if (existing.length) {
    await execute(`DELETE FROM favorites WHERE user_id = ? AND ${column} = ?`, [
      userId,
      value,
    ]);
    return { favorite: false };
  }

  await execute(
    "INSERT INTO favorites (user_id, movie_id, imdb_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
    [userId, movieId ?? null, imdbId ?? null],
  );
  return { favorite: true };
}
