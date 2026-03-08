import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const playlistId = Number(params.id);
  if (!playlistId || Number.isNaN(playlistId)) {
    return NextResponse.json({ message: "Invalid playlist id" }, { status: 400 });
  }

  try {
    // Ensure the playlist exists and belongs to the user
    const playlist = await query<{ id: number; name: string }[]>(
      "SELECT id, name FROM playlists WHERE id = ? AND user_id = ? LIMIT 1",
      [playlistId, user.id],
    );

    if (!playlist.length) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 });
    }

    if (playlist[0].name === "My List") {
      return NextResponse.json({ message: "Cannot delete My List" }, { status: 403 });
    }

    // Delete the playlist (cascade will delete playlist_items)
    await execute("DELETE FROM playlists WHERE id = ? AND user_id = ?", [playlistId, user.id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete playlist", error);
    return NextResponse.json(
      { message: "Unable to delete playlist." },
      { status: 500 },
    );
  }
}
