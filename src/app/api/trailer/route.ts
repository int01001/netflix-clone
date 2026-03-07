import { NextRequest, NextResponse } from "next/server";
import { getTmdbTrailerWatchUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const imdbId = searchParams.get("imdbId") ?? undefined;
  const tmdbIdParam = searchParams.get("tmdbId") ?? undefined;

  if (!title && !imdbId && !tmdbIdParam) {
    return NextResponse.json(
      { message: "title or imdbId or tmdbId required" },
      { status: 400 },
    );
  }

  try {
    const parsedTmdbFromImdb = imdbId?.startsWith("tmdb:")
      ? Number.parseInt(imdbId.replace("tmdb:", ""), 10)
      : null;
    const parsedTmdbFromParam = tmdbIdParam
      ? Number.parseInt(tmdbIdParam, 10)
      : null;
    const tmdbMovieId = parsedTmdbFromParam ?? parsedTmdbFromImdb;

    if (!tmdbMovieId || !Number.isFinite(tmdbMovieId)) {
      return NextResponse.json({ message: "TMDB movie id is required" }, { status: 400 });
    }

    const watchUrl = await getTmdbTrailerWatchUrl(tmdbMovieId);
    if (!watchUrl) {
      return NextResponse.json({ message: "Trailer unavailable" }, { status: 404 });
    }

    return NextResponse.json({
      url: watchUrl,
      watchUrl,
      from: "tmdb",
    });
  } catch (error) {
    console.error("Trailer lookup failed", error);
    return NextResponse.json(
      { message: "Trailer lookup failed" },
      { status: 500 },
    );
  }
}
