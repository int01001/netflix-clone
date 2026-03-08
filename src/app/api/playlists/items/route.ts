import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

type PlaylistItemRow = {
  id: number;
  imdb_id: string | null;
  movie_id: number | null;
};

async function ensureDefaultPlaylist(userId: number): Promise<void> {
  await execute(
    "INSERT IGNORE INTO playlists (user_id, name) VALUES (?, ?)",
    [userId, "My List"],
  );
}

async function migrateLegacyFavorites(userId: number): Promise<void> {
  await ensureDefaultPlaylist(userId);

  const playlists = await query<{ id: number }[]>(
    "SELECT id FROM playlists WHERE user_id = ? AND name = ? LIMIT 1",
    [userId, "My List"],
  );
  const playlistId = playlists[0]?.id;
  if (!playlistId) return;

  try {
    const favs = await query<{ imdb_id: string | null; movie_id: number | null }[]>(
      "SELECT imdb_id, movie_id FROM favorites WHERE user_id = ?",
      [userId],
    );

    for (const fav of favs) {
      await execute(
        "INSERT IGNORE INTO playlist_items (playlist_id, movie_id, imdb_id) VALUES (?, ?, ?)",
        [playlistId, fav.movie_id ?? null, fav.imdb_id ?? null],
      );
    }
  } catch {
    // favorites table might not exist.
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const playlistId = Number(searchParams.get("playlistId"));
  if (!playlistId || Number.isNaN(playlistId)) {
    return NextResponse.json({ message: "playlistId is required" }, { status: 400 });
  }

  try {
    await migrateLegacyFavorites(user.id);

    const allowed = await query<{ id: number }[]>(
      "SELECT id FROM playlists WHERE id = ? AND user_id = ? LIMIT 1",
      [playlistId, user.id],
    );
    if (!allowed.length) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const rows = await query<PlaylistItemRow[]>(
      "SELECT id, imdb_id, movie_id FROM playlist_items WHERE playlist_id = ? ORDER BY created_at DESC",
      [playlistId],
    );

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error("Failed to load playlist items", error);
    return NextResponse.json(
      { message: "Unable to load playlist items." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const playlistId = Number(body.playlistId);
    const imdbId = body.imdbId ? String(body.imdbId) : null;
    const movieId = body.movieId ? Number(body.movieId) : null;

    if (!playlistId || Number.isNaN(playlistId)) {
      return NextResponse.json({ message: "playlistId is required" }, { status: 400 });
    }

    if (!imdbId && !movieId) {
      return NextResponse.json({ message: "movieId or imdbId is required" }, { status: 400 });
    }

    await migrateLegacyFavorites(user.id);

    const allowed = await query<{ id: number }[]>(
      "SELECT id FROM playlists WHERE id = ? AND user_id = ? LIMIT 1",
      [playlistId, user.id],
    );
    if (!allowed.length) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    await execute(
      "INSERT IGNORE INTO playlist_items (playlist_id, movie_id, imdb_id) VALUES (?, ?, ?)",
      [playlistId, movieId ?? null, imdbId ?? null],
    );

    await execute(
      "UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [playlistId],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to add playlist item", error);
    return NextResponse.json(
      { message: "Unable to add to playlist." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const playlistId = Number(body.playlistId);
    const imdbId = body.imdbId ? String(body.imdbId) : null;
    const movieId = body.movieId ? Number(body.movieId) : null;

    if (!playlistId || Number.isNaN(playlistId)) {
      return NextResponse.json({ message: "playlistId is required" }, { status: 400 });
    }

    if (!imdbId && !movieId) {
      return NextResponse.json({ message: "movieId or imdbId is required" }, { status: 400 });
    }

    await migrateLegacyFavorites(user.id);

    const allowed = await query<{ id: number }[]>(
      "SELECT id FROM playlists WHERE id = ? AND user_id = ? LIMIT 1",
      [playlistId, user.id],
    );
    if (!allowed.length) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (imdbId) {
      await execute(
        "DELETE FROM playlist_items WHERE playlist_id = ? AND imdb_id = ?",
        [playlistId, imdbId],
      );
    } else if (movieId) {
      await execute(
        "DELETE FROM playlist_items WHERE playlist_id = ? AND movie_id = ?",
        [playlistId, movieId],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove playlist item", error);
    return NextResponse.json(
      { message: "Unable to remove from playlist." },
      { status: 500 },
    );
  }
}
