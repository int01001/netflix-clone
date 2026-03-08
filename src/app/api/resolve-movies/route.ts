import { NextRequest, NextResponse } from "next/server";
import { getTmdbMoviesByExternalIds } from "@/lib/tmdb";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("imdbIds") ?? "").trim();

  if (!raw) {
    return NextResponse.json({ movies: [] });
  }

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) {
    return NextResponse.json({ movies: [] });
  }

  try {
    const movies = await getTmdbMoviesByExternalIds(ids);
    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Failed to resolve external ids", error);
    return NextResponse.json({ movies: [] });
  }
}
