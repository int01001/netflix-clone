import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

type HistoryRow = {
  position_seconds: number;
  duration_seconds: number;
  movie_id: number | null;
  imdb_id: string | null;
};

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  const imdbId = searchParams.get("imdbId");

  try {
    if (movieId || tmdbId) {
      const rows = await query<HistoryRow[]>(
        `SELECT position_seconds, duration_seconds, movie_id, imdb_id
         FROM watch_history
         WHERE user_id = ?
           AND (${movieId ? "movie_id = ?" : "1=0"} OR ${imdbId ? "imdb_id = ?" : "1=0"})
         LIMIT 1`,
        [user.id, movieId ? Number(movieId) : 0, imdbId ? imdbId : ""].filter(
          (v, idx) => (movieId || imdbId) || idx === 0,
        ),
      );
      return NextResponse.json({ history: rows[0] ?? null });
    }

    const rows = await query<HistoryRow[]>(
      "SELECT position_seconds, duration_seconds, movie_id, imdb_id FROM watch_history WHERE user_id = ?",
      [user.id],
    );
    return NextResponse.json({ history: rows });
  } catch (error) {
    console.error("History fetch failed", error);
    return NextResponse.json({ message: "Unable to load history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const movieId = body.movieId ? Number(body.movieId) : null;
    const imdbId = body.imdbId ? String(body.imdbId) : null;
    const position = Number(body.positionSeconds ?? 0);
    const duration = Number(body.durationSeconds ?? 0);

    if (!movieId && !imdbId) {
      return NextResponse.json(
        { message: "movieId or imdbId required" },
        { status: 400 },
      );
    }

    await execute(
      `INSERT INTO watch_history (user_id, movie_id, imdb_id, position_seconds, duration_seconds)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE position_seconds = VALUES(position_seconds),
                               duration_seconds = VALUES(duration_seconds),
                               last_watched_at = CURRENT_TIMESTAMP`,
      [user.id, movieId, imdbId, position, duration],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("History update failed", error);
    return NextResponse.json({ message: "Unable to save progress" }, { status: 500 });
  }
}
