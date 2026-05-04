# Shortened Backend Code

This is a shortened but still clear version of the backend side of the CineWave / Netflix clone. The backend is built with Next.js App Router API routes, MySQL, JWT session cookies, TMDB integration, email OTP verification, playlists, watch history, and mood recommendations.

## Database Connectivity Code

The app connects to MySQL through a shared connection pool in `src/lib/db.ts`. The pool is stored on `globalThis` so development reloads do not create too many database connections.

```ts
// src/lib/db.ts
import mysql from "mysql2/promise";

declare global {
  var mysqlPool: mysql.Pool | undefined;
}

const buildConfig = () => ({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "netflix_local",
});

export const getPool = (): mysql.Pool => {
  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = mysql.createPool({
      ...buildConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return globalThis.mysqlPool;
};

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  values?: unknown[],
): Promise<T> {
  const [rows] = await getPool().query(sql, values);
  return rows as T;
}

export async function execute(
  sql: string,
  values?: unknown[],
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute<mysql.ResultSetHeader>(sql, values);
  return result;
}
```

## Backend Structure

```txt
src/lib/
  db.ts                  MySQL connection pool and query helpers
  auth.ts                Password hashing and JWT session helpers
  session.ts             Reads current user from request cookie
  data.ts                Server-side user, favorites, history, home sections
  tmdb.ts                TMDB fetch, mapping, search, trailers
  mail.ts                Email sending for OTP flows
  validation.ts          Zod schemas
  types.ts               Shared User, Movie, HomeSections types

src/app/api/
  auth/login/route.ts
  auth/logout/route.ts
  auth/me/route.ts
  auth/signup/request/route.ts
  auth/signup/verify/route.ts
  auth/signup/complete/route.ts
  auth/forgot-password/request/route.ts
  auth/forgot-password/verify/route.ts
  auth/forgot-password/reset/route.ts
  search/route.ts
  trailer/route.ts
  history/route.ts
  playlists/route.ts
  playlists/items/route.ts
  playlists/[id]/route.ts
  chat/recommend/route.ts

scripts/
  init-db.sql            Database schema and seed movies
  setup-db.js            Runs schema setup
  ensure-local-mysql.js  Checks local MySQL before dev/build/start
```

## Shared Types

```ts
// src/lib/types.ts
export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  is_pending_profile?: boolean;
};

export type Movie = {
  id: number;
  imdbId?: string | null;
  tmdbId?: number | null;
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
  progressSeconds?: number | null;
  durationSeconds?: number | null;
  featured: boolean;
};

export type HomeSections = {
  featured: Movie | null;
  trending: Movie[];
  newReleases: Movie[];
  sciFi: Movie[];
  drama: Movie[];
  continueWatching?: Movie[];
  favorites?: Movie[];
};
```

## Auth and Sessions

Passwords are hashed with bcrypt. Sessions are JWTs stored in an HTTP-only cookie named `session`.

```ts
// src/lib/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_DAYS = 7;

export type SessionPayload = {
  userId: number;
  email: string;
  name?: string;
};

const getSecret = () => process.env.AUTH_SECRET ?? "dev-secret";

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePasswords = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signSession = (payload: SessionPayload) =>
  jwt.sign(payload, getSecret(), { expiresIn: `${SESSION_DAYS}d` });

export const verifySession = (token: string): SessionPayload | null => {
  try {
    return jwt.verify(token, getSecret()) as SessionPayload;
  } catch {
    return null;
  }
};

export const sessionCookieOptions = {
  name: "session",
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
  secure: process.env.NODE_ENV === "production",
};
```

```ts
// src/lib/session.ts
import { NextRequest } from "next/server";
import { verifySession } from "./auth";
import { query } from "./db";
import type { User } from "./types";

export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  const users = await query<User[]>(
    "SELECT id, name, email, avatar_url AS avatarUrl, is_pending_profile FROM users WHERE id = ? LIMIT 1",
    [payload.userId],
  );

  return users[0] ?? null;
}
```

## Login Route

The login route validates input, finds the user, checks the password, signs a session, and writes the session cookie.

```ts
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { comparePasswords, signSession, sessionCookieOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import type { User } from "@/lib/types";

type UserRow = User & { password_hash: string };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const users = await query<UserRow[]>(
    "SELECT id, name, email, password_hash, avatar_url AS avatarUrl FROM users WHERE email = ? LIMIT 1",
    [parsed.data.email],
  );

  const user = users[0];
  if (!user) return NextResponse.json({ message: "No account found for that email." }, { status: 404 });

  const valid = await comparePasswords(parsed.data.password, user.password_hash);
  if (!valid) return NextResponse.json({ message: "Password is incorrect." }, { status: 401 });

  const token = signSession({ userId: user.id, email: user.email, name: user.name });
  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  response.cookies.set({ ...sessionCookieOptions, value: token });

  return response;
}
```

## Signup OTP Flow

Signup is split into request, verify, and complete.

### Request OTP

```ts
// src/app/api/auth/signup/request/route.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { sendWelcomeVerificationEmail } from "@/lib/mail";

const OTP_TTL_MINUTES = 10;
const hashOtp = (otp: string) => crypto.createHash("sha256").update(otp).digest("hex");
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || password.length < 6) {
    return NextResponse.json({ message: "Valid email and password are required" }, { status: 400 });
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      "UPDATE email_verification_otps SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND used_at IS NULL",
      [email],
    );

    await connection.execute(
      "INSERT INTO email_verification_otps (email, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE)) ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), used_at = NULL",
      [email, otpHash, OTP_TTL_MINUTES],
    );

    await connection.execute(
      "INSERT INTO temp_signup_passwords (email, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)",
      [email, password],
    );

    await connection.commit();
  } catch {
    await connection.rollback();
    return NextResponse.json({ message: "Database connection is not established." }, { status: 503 });
  } finally {
    connection.release();
  }

  await sendWelcomeVerificationEmail({ to: email, otp });
  return NextResponse.json({ ok: true });
}
```

### Verify OTP

```ts
// src/app/api/auth/signup/verify/route.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { hashPassword, signSession, sessionCookieOptions } from "@/lib/auth";

const hashOtp = (otp: string) => crypto.createHash("sha256").update(otp).digest("hex");

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json().catch(() => ({}));

  const rows = await query<Array<{ id: number; otp_hash: string; expires_at: string }>>(
    "SELECT id, otp_hash, expires_at FROM email_verification_otps WHERE email = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
    [String(email).toLowerCase()],
  );

  const record = rows[0];
  if (!record) return NextResponse.json({ message: "Invalid code" }, { status: 400 });
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ message: "Code expired" }, { status: 400 });
  }
  if (hashOtp(String(otp)) !== record.otp_hash) {
    return NextResponse.json({ message: "Invalid code" }, { status: 400 });
  }

  const password = (await query<{ password: string }[]>(
    "SELECT password FROM temp_signup_passwords WHERE email = ? LIMIT 1",
    [email],
  ))[0]?.password;

  if (!password) return NextResponse.json({ message: "Session expired. Please sign up again." }, { status: 400 });

  const result = await execute(
    "INSERT INTO users (email, password_hash, name, is_pending_profile) VALUES (?, ?, ?, TRUE)",
    [email, await hashPassword(password), "New User"],
  );

  await execute("UPDATE email_verification_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?", [record.id]);
  await execute("DELETE FROM temp_signup_passwords WHERE email = ?", [email]);

  const token = signSession({ userId: result.insertId, email, name: "pending-profile" });
  const response = NextResponse.json({ token });
  response.cookies.set({ ...sessionCookieOptions, value: token });

  return response;
}
```

### Complete Profile

```ts
// src/app/api/auth/signup/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !user.is_pending_profile) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, phone, dateOfBirth, gender, preferred_genres, preferred_languages } = body;

  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  if (!Array.isArray(preferred_genres) || preferred_genres.length !== 5) {
    return NextResponse.json({ message: "Select exactly 5 genres" }, { status: 400 });
  }
  if (!Array.isArray(preferred_languages) || preferred_languages.length !== 3) {
    return NextResponse.json({ message: "Select exactly 3 languages" }, { status: 400 });
  }

  await execute("UPDATE users SET name = ?, is_pending_profile = FALSE WHERE id = ?", [name, user.id]);

  await execute(
    `INSERT INTO user_preferences
       (user_id, name, phone, date_of_birth, gender, preferred_genres, preferred_languages)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       phone = VALUES(phone),
       date_of_birth = VALUES(date_of_birth),
       gender = VALUES(gender),
       preferred_genres = VALUES(preferred_genres),
       preferred_languages = VALUES(preferred_languages)`,
    [
      user.id,
      name,
      phone || null,
      dateOfBirth || null,
      gender || "prefer_not_to_say",
      JSON.stringify(preferred_genres),
      JSON.stringify(preferred_languages),
    ],
  );

  return NextResponse.json({ ok: true });
}
```

## Server Data Layer

`data.ts` powers the server-rendered home page.

```ts
// src/lib/data.ts
import { cookies } from "next/headers";
import { verifySession } from "./auth";
import { execute, query } from "./db";
import { getTmdbMoviesByExternalIds, getTmdbSections } from "./tmdb";
import type { HomeSections, Movie, User } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  const users = await query<User[]>(
    "SELECT id, name, email, avatar_url AS avatarUrl FROM users WHERE id = ? LIMIT 1",
    [payload.userId],
  );

  return users[0] ?? null;
}

export async function getFavorites(userId: number): Promise<Movie[]> {
  await execute("INSERT IGNORE INTO playlists (user_id, name) VALUES (?, ?)", [userId, "My List"]);

  const playlists = await query<{ id: number }[]>(
    "SELECT id FROM playlists WHERE user_id = ? AND name = ? LIMIT 1",
    [userId, "My List"],
  );

  const playlistId = playlists[0]?.id;
  if (!playlistId) return [];

  const items = await query<{ imdb_id: string | null }[]>(
    "SELECT imdb_id FROM playlist_items WHERE playlist_id = ? AND imdb_id IS NOT NULL",
    [playlistId],
  );

  return getTmdbMoviesByExternalIds(items.map((item) => item.imdb_id).filter(Boolean) as string[]);
}

export async function getContinueWatching(userId: number): Promise<Movie[]> {
  const rows = await query<Array<{ imdb_id: string | null; position_seconds: number; duration_seconds: number }>>(
    `SELECT imdb_id, position_seconds, duration_seconds
     FROM watch_history
     WHERE user_id = ? AND position_seconds > 0
     ORDER BY last_watched_at DESC
     LIMIT 18`,
    [userId],
  );

  const movies = await getTmdbMoviesByExternalIds(rows.map((row) => row.imdb_id).filter(Boolean) as string[]);
  const byImdb = new Map(movies.map((movie) => [movie.imdbId, movie]));

  return rows.flatMap((row) => {
    const movie = byImdb.get(row.imdb_id);
    return movie ? [{ ...movie, progressSeconds: row.position_seconds, durationSeconds: row.duration_seconds }] : [];
  });
}

export async function getHomeSections(userId?: number): Promise<HomeSections> {
  const [favorites, continueWatching] = userId
    ? await Promise.all([getFavorites(userId), getContinueWatching(userId)])
    : [[], []];

  const tmdbSections = await getTmdbSections();
  return {
    ...tmdbSections,
    favorites,
    continueWatching,
  };
}
```

## TMDB Integration

`tmdb.ts` maps TMDB API responses into the app's shared `Movie` type.

```ts
// src/lib/tmdb.ts
import type { HomeSections, Movie } from "./types";

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  18: "Drama",
  27: "Horror",
  878: "Sci-Fi",
  53: "Thriller",
  10749: "Romance",
};

const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  drama: 18,
  horror: 27,
  romance: 10749,
  "sci-fi": 878,
  "science fiction": 878,
  thriller: 53,
};

async function tmdb<T>(path: string, params?: Record<string, string>): Promise<T> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) throw new Error("TMDB_API_KEY is missing");

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB request failed at ${path}`);
  return res.json() as Promise<T>;
}

const image = (path?: string | null, size: "w500" | "w780" = "w780") =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

function mapListMovie(m: any): Movie {
  const title = m.title ?? m.name ?? "Untitled";
  const release = m.release_date ?? m.first_air_date;

  return {
    id: m.id,
    tmdbId: m.id,
    imdbId: `tmdb:${m.id}`,
    slug: `tmdb-${m.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    tagline: null,
    genre: m.genre_ids?.map((id: number) => GENRE_MAP[id]).find(Boolean) ?? null,
    year: release ? Number(release.slice(0, 4)) : null,
    durationMinutes: null,
    rating: typeof m.vote_average === "number" ? Number(m.vote_average.toFixed(1)) : null,
    description: m.overview ?? null,
    backdropUrl: image(m.backdrop_path, "w780"),
    thumbnailUrl: image(m.poster_path, "w500"),
    trailerUrl: null,
    featured: false,
  };
}

const dedupe = (movies: Movie[]) => {
  const seen = new Set<number>();
  return movies.filter((movie) => {
    const key = movie.tmdbId ?? movie.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function getTmdbSections(): Promise<HomeSections> {
  const [trending, nowPlaying, topRated, popular] = await Promise.all([
    tmdb<{ results: any[] }>("/trending/movie/week"),
    tmdb<{ results: any[] }>("/movie/now_playing"),
    tmdb<{ results: any[] }>("/movie/top_rated"),
    tmdb<{ results: any[] }>("/movie/popular"),
  ]);

  const trendingMovies = dedupe(trending.results.map(mapListMovie));
  const newReleases = dedupe(nowPlaying.results.map(mapListMovie));
  const top = dedupe(topRated.results.map(mapListMovie));
  const popularMovies = dedupe(popular.results.map(mapListMovie));
  const combined = dedupe([...trendingMovies, ...newReleases, ...top, ...popularMovies]);

  const featured = combined[0] ?? null;
  if (featured) featured.featured = true;

  return {
    featured,
    trending: trendingMovies.slice(0, 20),
    newReleases: newReleases.slice(0, 20),
    sciFi: combined.filter((m) => m.genre?.toLowerCase().includes("sci")).slice(0, 20),
    drama: combined.filter((m) => m.genre?.toLowerCase().includes("drama")).slice(0, 20),
    favorites: [],
  };
}

export async function searchTmdbMovies(query: string, page: number): Promise<Movie[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: any[] }>("/search/movie", {
    query,
    include_adult: "false",
    page: String(page),
  });
  return dedupe(data.results.map(mapListMovie));
}

export async function getTmdbMoviesByGenre(genre: string, page: number): Promise<Movie[]> {
  const genreId = GENRE_NAME_TO_ID[genre.toLowerCase().trim()];
  if (!genreId) return searchTmdbMovies(`${genre} movie`, page);

  const data = await tmdb<{ results: any[] }>("/discover/movie", {
    include_adult: "false",
    sort_by: "popularity.desc",
    with_genres: String(genreId),
    page: String(page),
  });

  return dedupe(data.results.map(mapListMovie)).map((movie) => ({ ...movie, genre }));
}

export async function getTmdbTrailerWatchUrl(movieId: number): Promise<string | null> {
  const data = await tmdb<{ results: Array<{ key: string; site: string; type: string; official?: boolean }> }>(
    `/movie/${movieId}/videos`,
  );

  const video = data.results
    .filter((v) => v.site.toLowerCase() === "youtube")
    .sort((a, b) => Number(b.official) - Number(a.official))[0];

  return video ? `https://www.youtube.com/watch?v=${video.key}` : null;
}
```

## Search API

```ts
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTmdbMoviesByGenre, searchTmdbMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const genre = searchParams.get("genre")?.trim() ?? "";
  const page = Math.min(Math.max(Number(searchParams.get("page") ?? 1), 1), 20);

  if (!q && !genre) return NextResponse.json({ results: [] });

  try {
    const results = genre
      ? await getTmdbMoviesByGenre(genre, page)
      : await searchTmdbMovies(q, page);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
```

## Trailer API

Only authenticated users can load trailers.

```ts
// src/app/api/trailer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTmdbTrailerWatchUrl } from "@/lib/tmdb";
import { getUserFromRequest } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Sign up or log in to watch trailers" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get("imdbId");
  const tmdbId = searchParams.get("tmdbId");

  const parsedTmdbId = tmdbId
    ? Number(tmdbId)
    : imdbId?.startsWith("tmdb:")
      ? Number(imdbId.replace("tmdb:", ""))
      : null;

  if (!parsedTmdbId) {
    return NextResponse.json({ message: "TMDB movie id is required" }, { status: 400 });
  }

  const watchUrl = await getTmdbTrailerWatchUrl(parsedTmdbId);
  if (!watchUrl) return NextResponse.json({ message: "Trailer unavailable" }, { status: 404 });

  return NextResponse.json({ url: watchUrl, watchUrl, from: "tmdb" });
}
```

## Playlists API

The app treats favorites as playlist items inside the default playlist named `"My List"`.

```ts
// src/app/api/playlists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

async function ensureDefaultPlaylist(userId: number) {
  await execute("INSERT IGNORE INTO playlists (user_id, name) VALUES (?, ?)", [userId, "My List"]);
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  await ensureDefaultPlaylist(user.id);

  const playlists = await query(
    "SELECT id, name, created_at, updated_at FROM playlists WHERE user_id = ? ORDER BY updated_at DESC",
    [user.id],
  );

  return NextResponse.json({ playlists });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ message: "name is required" }, { status: 400 });

  await execute("INSERT INTO playlists (user_id, name) VALUES (?, ?)", [user.id, name]);

  const playlists = await query(
    "SELECT id, name, created_at, updated_at FROM playlists WHERE user_id = ? ORDER BY updated_at DESC",
    [user.id],
  );

  return NextResponse.json({ playlists });
}
```

```ts
// src/app/api/playlists/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

async function canAccessPlaylist(userId: number, playlistId: number) {
  const rows = await query<{ id: number }[]>(
    "SELECT id FROM playlists WHERE id = ? AND user_id = ? LIMIT 1",
    [playlistId, userId],
  );
  return rows.length > 0;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const playlistId = Number(body.playlistId);
  const movieId = body.movieId ? Number(body.movieId) : null;
  const imdbId = body.imdbId ? String(body.imdbId) : null;

  if (!playlistId || (!movieId && !imdbId)) {
    return NextResponse.json({ message: "playlistId and movie identity are required" }, { status: 400 });
  }
  if (!(await canAccessPlaylist(user.id, playlistId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await execute(
    "INSERT IGNORE INTO playlist_items (playlist_id, movie_id, imdb_id) VALUES (?, ?, ?)",
    [playlistId, movieId, imdbId],
  );
  await execute("UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [playlistId]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const playlistId = Number(body.playlistId);
  const movieId = body.movieId ? Number(body.movieId) : null;
  const imdbId = body.imdbId ? String(body.imdbId) : null;

  if (!(await canAccessPlaylist(user.id, playlistId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (imdbId) {
    await execute("DELETE FROM playlist_items WHERE playlist_id = ? AND imdb_id = ?", [playlistId, imdbId]);
  } else {
    await execute("DELETE FROM playlist_items WHERE playlist_id = ? AND movie_id = ?", [playlistId, movieId]);
  }

  return NextResponse.json({ ok: true });
}
```

## Watch History API

Watch history stores progress by `movie_id` or `imdb_id` and powers continue watching.

```ts
// src/app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  const imdbId = searchParams.get("imdbId");

  const rows = await query(
    "SELECT position_seconds, duration_seconds, movie_id, imdb_id FROM watch_history WHERE user_id = ?",
    [user.id],
  );

  return NextResponse.json({ history: movieId || imdbId ? rows[0] ?? null : rows });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const movieId = body.movieId ? Number(body.movieId) : null;
  const imdbId = body.imdbId ? String(body.imdbId) : null;
  const position = Number(body.positionSeconds ?? 0);
  const duration = Number(body.durationSeconds ?? 0);

  if (!movieId && !imdbId) {
    return NextResponse.json({ message: "movieId or imdbId required" }, { status: 400 });
  }

  await execute(
    `INSERT INTO watch_history (user_id, movie_id, imdb_id, position_seconds, duration_seconds)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       position_seconds = VALUES(position_seconds),
       duration_seconds = VALUES(duration_seconds),
       last_watched_at = CURRENT_TIMESTAMP`,
    [user.id, movieId, imdbId, position, duration],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  const imdbId = searchParams.get("imdbId");

  if (imdbId) {
    await execute("DELETE FROM watch_history WHERE user_id = ? AND imdb_id = ?", [user.id, imdbId]);
  } else if (movieId) {
    await execute("DELETE FROM watch_history WHERE user_id = ? AND movie_id = ?", [user.id, Number(movieId)]);
  }

  return NextResponse.json({ ok: true });
}
```

## Mood Recommendation API

This route parses the user's mood/message, builds search intent, fetches movies by genre and query, scores them, then returns recommendations.

```ts
// src/app/api/chat/recommend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTmdbMoviesByGenre, searchTmdbMovies } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

type MoodKey = "happy" | "sad" | "stressed" | "romantic" | "bored" | "excited" | "chill";

const MOOD_PROFILES: Record<MoodKey, { label: string; keywords: string[]; genres: string[]; queries: string[]; reply: string }> = {
  happy: {
    label: "Happy",
    keywords: ["happy", "joy", "fun", "celebrate"],
    genres: ["Comedy", "Adventure", "Animation"],
    queries: ["feel good movie", "uplifting comedy"],
    reply: "Great vibe. I picked feel-good and high-energy titles for you.",
  },
  sad: {
    label: "Sad",
    keywords: ["sad", "low", "heartbroken", "lonely"],
    genres: ["Drama", "Romance", "Animation"],
    queries: ["comfort movie", "heartwarming movie"],
    reply: "I focused on comforting and emotional stories.",
  },
  stressed: {
    label: "Stressed",
    keywords: ["stressed", "anxious", "overwhelmed"],
    genres: ["Comedy", "Fantasy", "Adventure"],
    queries: ["light comedy movie", "easy watch movie"],
    reply: "I prioritized easy-to-watch picks to help you decompress.",
  },
  romantic: {
    label: "Romantic",
    keywords: ["romantic", "love", "date"],
    genres: ["Romance", "Drama", "Comedy"],
    queries: ["romantic movie", "date night movie"],
    reply: "I selected date-night and romance-first recommendations.",
  },
  bored: {
    label: "Bored",
    keywords: ["bored", "nothing to watch", "dull"],
    genres: ["Action", "Thriller", "Sci-Fi"],
    queries: ["must watch thriller", "mind blowing movie"],
    reply: "I went with gripping titles to pull you in quickly.",
  },
  excited: {
    label: "Excited",
    keywords: ["excited", "hyped", "adrenaline"],
    genres: ["Action", "Adventure", "Sci-Fi"],
    queries: ["high energy movie", "epic blockbuster"],
    reply: "I chose fast-paced picks that match your energy.",
  },
  chill: {
    label: "Chill",
    keywords: ["chill", "calm", "relax", "easy"],
    genres: ["Drama", "Mystery", "Fantasy"],
    queries: ["slow burn movie", "cozy movie"],
    reply: "I curated smooth, low-stress options for a chill watch.",
  },
};

function detectMood(text: string): MoodKey {
  let best: MoodKey = "chill";
  let bestScore = 0;

  for (const [mood, profile] of Object.entries(MOOD_PROFILES) as [MoodKey, typeof MOOD_PROFILES[MoodKey]][]) {
    const score = profile.keywords.filter((keyword) => text.includes(keyword)).length;
    if (score > bestScore) {
      best = mood;
      bestScore = score;
    }
  }

  return best;
}

function uniqueMovies(movies: Movie[]) {
  const seen = new Set<string | number>();
  return movies.filter((movie) => {
    const key = movie.imdbId ?? movie.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreMovie(movie: Movie, genres: string[]) {
  let score = movie.rating ?? 0;
  if (genres.some((genre) => movie.genre?.toLowerCase().includes(genre.toLowerCase()))) score += 3;
  if (!movie.backdropUrl && !movie.thumbnailUrl) score -= 3;
  return score;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").toLowerCase();
  const forcedMood = String(body.mood ?? "").toLowerCase() as MoodKey;
  const mood = MOOD_PROFILES[forcedMood] ? forcedMood : detectMood(message);
  const profile = MOOD_PROFILES[mood];

  const settled = await Promise.allSettled([
    ...profile.genres.map((genre) => getTmdbMoviesByGenre(genre, 1)),
    ...profile.queries.map((query) => searchTmdbMovies(query, 1)),
  ]);

  const movies = uniqueMovies(
    settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  )
    .sort((a, b) => scoreMovie(b, profile.genres) - scoreMovie(a, profile.genres))
    .slice(0, 14);

  return NextResponse.json({
    mood,
    moodLabel: profile.label,
    reply: `${profile.reply} Found ${movies.length} recommendations.`,
    movies,
  });
}
```

## Database Schema Summary

```sql
-- scripts/init-db.sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  is_pending_profile BOOLEAN DEFAULT FALSE
);

CREATE TABLE movies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  genre VARCHAR(50),
  year INT,
  duration_minutes INT,
  rating DECIMAL(3,1),
  description TEXT,
  backdrop_url VARCHAR(300),
  thumbnail_url VARCHAR(300),
  trailer_url VARCHAR(300),
  featured TINYINT(1)
);

CREATE TABLE playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  UNIQUE KEY uniq_user_name (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE playlist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id INT NOT NULL,
  movie_id INT NULL,
  imdb_id VARCHAR(20) NULL,
  UNIQUE KEY uniq_playlist_movie (playlist_id, movie_id),
  UNIQUE KEY uniq_playlist_imdb (playlist_id, imdb_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE TABLE watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  movie_id INT NULL,
  imdb_id VARCHAR(20) NULL,
  position_seconds INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_movie (user_id, movie_id),
  UNIQUE KEY uniq_user_imdb (user_id, imdb_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_verification_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL
);

CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(80),
  phone VARCHAR(20),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
  preferred_genres JSON,
  preferred_languages JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Backend Request Flow

```txt
Login:
  POST /api/auth/login
    -> validate with Zod
    -> find user by email
    -> compare bcrypt password
    -> sign JWT
    -> set HTTP-only session cookie

Signup:
  POST /api/auth/signup/request
    -> generate OTP
    -> hash OTP
    -> store temporary password
    -> email OTP
  POST /api/auth/signup/verify
    -> verify OTP
    -> create pending user
    -> set session cookie
  POST /api/auth/signup/complete
    -> require pending user
    -> save profile preferences
    -> mark profile complete

Home data:
  getCurrentUser()
    -> read session cookie
    -> verify JWT
    -> load user from MySQL
  getHomeSections(userId)
    -> fetch TMDB sections
    -> load My List playlist
    -> load continue watching

Movie actions:
  GET /api/search
    -> TMDB search or genre discovery
  GET /api/trailer
    -> require auth
    -> get YouTube trailer from TMDB videos
  POST /api/playlists/items
    -> require auth
    -> insert playlist item
  DELETE /api/playlists/items
    -> require auth
    -> remove playlist item
  POST /api/history
    -> require auth
    -> upsert watch progress
```

## Important Backend Ideas

- MySQL stores users, sessions-related data, playlists, playlist items, preferences, and watch history.
- JWT sessions are stored in HTTP-only cookies and verified on every protected API route.
- TMDB provides most movie catalog data; local seeded movies exist as fallback/demo data.
- The app uses `imdbId` values like `tmdb:12345` to identify TMDB movies consistently.
- Favorites are not a standalone feature anymore; they are represented by items in the default `"My List"` playlist.
- Continue watching comes from `watch_history` records with `position_seconds > 0`.
- OTP codes are stored as SHA-256 hashes and expire after 10 minutes.
