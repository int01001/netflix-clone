import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

type PlaylistRow = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
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

  // Migrate only TMDB/external favorites (imdb_id), since existing UI relies on TMDB titles.
  // If you later add local movie favorites, we can migrate movie_id as well.
  try {
    const favs = await query<{ imdb_id: string | null; movie_id: number | null }[]>(
      "SELECT imdb_id, movie_id FROM favorites WHERE user_id = ?",
      [userId],
    );

    if (!favs.length) return;

    for (const fav of favs) {
      await execute(
        "INSERT IGNORE INTO playlist_items (playlist_id, movie_id, imdb_id) VALUES (?, ?, ?)",
        [playlistId, fav.movie_id ?? null, fav.imdb_id ?? null],
      );
    }
  } catch {
    // favorites table might not exist on fresh installs; ignore.
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    await migrateLegacyFavorites(user.id);

    const rows = await query<PlaylistRow[]>(
      "SELECT id, name, created_at, updated_at FROM playlists WHERE user_id = ? ORDER BY updated_at DESC",
      [user.id],
    );

    return NextResponse.json({ playlists: rows });
  } catch (error) {
    console.error("Failed to load playlists", error);
    return NextResponse.json(
      { message: "Unable to load playlists." },
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
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ message: "name is required" }, { status: 400 });
    }

    await migrateLegacyFavorites(user.id);

    await execute(
      "INSERT INTO playlists (user_id, name) VALUES (?, ?)",
      [user.id, name],
    );

    const rows = await query<PlaylistRow[]>(
      "SELECT id, name, created_at, updated_at FROM playlists WHERE user_id = ? ORDER BY updated_at DESC",
      [user.id],
    );

    return NextResponse.json({ playlists: rows });
  } catch (error) {
    // Likely duplicate name because of uniq_user_name.
    console.error("Failed to create playlist", error);
    return NextResponse.json(
      { message: "Unable to create playlist." },
      { status: 500 },
    );
  }
}
