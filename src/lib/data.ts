import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { verifySession } from "./auth";
import { execute, query } from "./db";
import { seedMovies } from "./seed-data";
import { getOmdbMoviesByIds, getOmdbSections } from "./omdb";
import type { HomeSections, Movie, User } from "./types";

type MovieRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  genre: string | null;
  year: number | null;
  durationMinutes: number | null;
  rating: number | null;
  description: string | null;
  backdropUrl: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  featured: number | null;
};

export const mapMovie = (row: MovieRow): Movie => ({
  id: row.id,
  tmdbId: null,
  imdbId: null,
  slug: row.slug,
  title: row.title,
  tagline: row.tagline,
  genre: row.genre,
  year: row.year,
  durationMinutes: row.durationMinutes,
  rating: row.rating,
  description: row.description,
  backdropUrl: row.backdropUrl,
  thumbnailUrl: row.thumbnailUrl,
  trailerUrl: row.trailerUrl,
  featured: !!row.featured,
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

export async function getMovies(): Promise<Movie[]> {
  noStore();
  const rows = await query<MovieRow[]>(
    `SELECT id, slug, title, tagline, genre, year,
            duration_minutes AS durationMinutes,
            rating, description, backdrop_url AS backdropUrl,
            thumbnail_url AS thumbnailUrl, trailer_url AS trailerUrl,
            featured
     FROM movies`,
  );

  return rows.map(mapMovie);
}

export async function getFavorites(userId: number): Promise<Movie[]> {
  noStore();
  const favs = await query<
    { movie_id: number | null; tmdb_id: number | null }[]
  >("SELECT movie_id, tmdb_id FROM favorites WHERE user_id = ?", [userId]);

  const localIds = favs.filter((f) => f.movie_id).map((f) => f.movie_id!);
  const tmdbIds = favs.filter((f) => f.tmdb_id).map((f) => f.tmdb_id!);

  const localMovies = localIds.length
    ? await query<MovieRow[]>(
        `SELECT id, slug, title, tagline, genre, year,
                duration_minutes AS durationMinutes,
                rating, description, backdrop_url AS backdropUrl,
                thumbnail_url AS thumbnailUrl, trailer_url AS trailerUrl,
                featured
         FROM movies WHERE id IN (?)`,
        [localIds],
      )
    : [];

  const omdbMovies = tmdbIds.length ? await getOmdbMoviesByIds(tmdbIds) : [];

  return [...localMovies.map(mapMovie), ...omdbMovies];
}

const buildSections = (
  movies: Movie[],
  favorites?: Movie[],
): HomeSections => {
  const featured =
    movies.find((m) => m.featured) ??
    movies
      .slice()
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ??
    seedMovies[0];

  const trending = movies
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10);

  const newReleases = movies
    .slice()
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 10);

  const sciFi = movies.filter(
    (m) => (m.genre ?? "").toLowerCase().includes("sci"),
  );
  const drama = movies.filter(
    (m) => (m.genre ?? "").toLowerCase().includes("drama"),
  );

  return {
    featured,
    trending: trending.length ? trending : seedMovies.slice(0, 6),
    newReleases: newReleases.length ? newReleases : seedMovies.slice(4, 10),
    sciFi: sciFi.length ? sciFi : seedMovies.filter((m) => m.genre === "Sci-Fi"),
    drama: drama.length
      ? drama
      : seedMovies.filter((m) => m.genre === "Drama").slice(0, 6),
    favorites,
  };
};

export async function getHomeSections(
  userId?: number,
): Promise<HomeSections> {
  try {
    const favorites = userId ? await getFavorites(userId) : undefined;

    if (process.env.OMDB_API_KEY) {
      const omdbSections = await getOmdbSections();
      return { ...omdbSections, favorites };
    }

    const movies = await getMovies();
    return movies.length
      ? buildSections(movies, favorites)
      : buildSections(seedMovies, favorites);
  } catch (error) {
    console.error("Falling back to seed data because DB is unavailable.", error);
    return buildSections(seedMovies, userId ? [] : undefined);
  }
}

export async function toggleFavorite(
  userId: number,
  movieId?: number,
  tmdbId?: number,
): Promise<{ favorite: boolean }> {
  const column = tmdbId ? "tmdb_id" : "movie_id";
  const value = tmdbId ?? movieId;

  if (!value) throw new Error("movieId or tmdbId required");

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
    "INSERT INTO favorites (user_id, movie_id, tmdb_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
    [userId, movieId ?? null, tmdbId ?? null],
  );
  return { favorite: true };
}
