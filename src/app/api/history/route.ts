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
    if (movieId || imdbId) {
      let sql =
        "SELECT position_seconds, duration_seconds, movie_id, imdb_id FROM watch_history WHERE user_id = ?";
      const params: Array<number | string> = [user.id];

      if (movieId && imdbId) {
        sql += " AND (movie_id = ? OR imdb_id = ?) LIMIT 1";
        params.push(Number(movieId), imdbId);
      } else if (movieId) {
        sql += " AND movie_id = ? LIMIT 1";
        params.push(Number(movieId));
      } else if (imdbId) {
        sql += " AND imdb_id = ? LIMIT 1";
        params.push(imdbId);
      }

      const rows = await query<HistoryRow[]>(sql, params);
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

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get("movieId");
  const imdbId = searchParams.get("imdbId");

  if (!movieId && !imdbId) {
    return NextResponse.json(
      { message: "movieId or imdbId required" },
      { status: 400 },
    );
  }

  try {
    if (movieId && imdbId) {
      await execute(
        "DELETE FROM watch_history WHERE user_id = ? AND (movie_id = ? OR imdb_id = ?)",
        [user.id, Number(movieId), imdbId],
      );
    } else if (movieId) {
      await execute("DELETE FROM watch_history WHERE user_id = ? AND movie_id = ?", [
        user.id,
        Number(movieId),
      ]);
    } else if (imdbId) {
      await execute("DELETE FROM watch_history WHERE user_id = ? AND imdb_id = ?", [
        user.id,
        imdbId,
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("History delete failed", error);
    return NextResponse.json(
      { message: "Unable to remove from continue watching" },
      { status: 500 },
    );
  }
}
