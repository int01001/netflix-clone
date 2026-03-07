import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { verifySession } from "./auth";
import { execute, query } from "./db";
import { getTmdbMoviesByExternalIds, getTmdbSections } from "./tmdb";
import type { HomeSections, Movie, User } from "./types";

const emptySections = (favorites?: Movie[]): HomeSections => ({
  featured: null,
  trending: [],
  newReleases: [],
  sciFi: [],
  drama: [],
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

export async function getHomeSections(userId?: number): Promise<HomeSections> {
  const favorites = userId ? await getFavorites(userId) : undefined;

  try {
    const tmdbSections = await getTmdbSections();
    return { ...tmdbSections, favorites };
  } catch (error) {
    console.error("TMDB catalog unavailable", error);
    return emptySections(favorites);
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
