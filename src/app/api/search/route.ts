import { NextRequest, NextResponse } from "next/server";
import { getTmdbMoviesByGenre, searchTmdbMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const genre = searchParams.get("genre")?.trim() ?? "";
  const page = Math.min(Math.max(Number(searchParams.get("page") ?? 1), 1), 20);
  const searchTerm = genre || q;

  if (!searchTerm) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = genre
      ? await getTmdbMoviesByGenre(genre, page)
      : await searchTmdbMovies(q, page);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB search failed", error);
    return NextResponse.json({ results: [] });
  }
}
