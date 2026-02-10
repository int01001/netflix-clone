import { NextRequest, NextResponse } from "next/server";
import movieTrailer from "movie-trailer";

export const dynamic = "force-dynamic";

const extractYouTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // handle /embed/ID or /shorts/ID
    const parts = u.pathname.split("/");
    const maybeId = parts.find((p) => p.length === 11);
    return maybeId ?? null;
  } catch {
    return null;
  }
};

const buildEmbed = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const imdbId = searchParams.get("imdbId") ?? undefined;

  if (!title && !imdbId) {
    return NextResponse.json({ message: "title or imdbId required" }, { status: 400 });
  }

  try {
    const foundUrl =
      (await movieTrailer(title, { id: imdbId ?? undefined })) ??
      (await movieTrailer(undefined, { id: imdbId ?? undefined })) ??
      null;

    const videoId = foundUrl ? extractYouTubeId(foundUrl) : null;

    if (videoId) {
      return NextResponse.json({
        url: buildEmbed(videoId),
        videoId,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }

    // Fallback: embed search playlist
    const search = encodeURIComponent(`${title} official trailer`);
    const fallback = `https://www.youtube.com/embed?autoplay=1&rel=0&modestbranding=1&controls=1&listType=search&list=${search}`;
    return NextResponse.json({
      url: fallback,
      watchUrl: `https://www.youtube.com/results?search_query=${search}`,
      from: "search-fallback",
    });
  } catch (error) {
    console.error("Trailer lookup failed", error);
    return NextResponse.json(
      { message: "Trailer lookup failed" },
      { status: 500 },
    );
  }
}
