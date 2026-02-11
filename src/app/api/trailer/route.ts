import { NextRequest, NextResponse } from "next/server";
import movieTrailer from "movie-trailer";
import { fallbackTrailerMap } from "@/lib/trailers";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const imdbId = searchParams.get("imdbId") ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  if (!title && !imdbId) {
    return NextResponse.json({ message: "title or imdbId required" }, { status: 400 });
  }

  try {
    // 1) Hardcoded overrides for reliability
    const override =
      (imdbId && fallbackTrailerMap[imdbId]) ||
      (slug && fallbackTrailerMap[slug]);
    if (override) {
      return NextResponse.json({
        url: override,
        watchUrl: override,
        from: "override",
      });
    }

    // 2) Try to discover via movie-trailer (YouTube ID)
    const foundUrl =
      (await movieTrailer(title, { id: imdbId ?? undefined })) ??
      (await movieTrailer(undefined, { id: imdbId ?? undefined })) ??
      null;

    const videoId = foundUrl ? extractYouTubeId(foundUrl) : null;

    if (videoId) {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      return NextResponse.json({
        url: watchUrl,
        videoId,
        watchUrl,
      });
    }

    // Fallback: static trailer for known seeds
    if (slug && fallbackTrailerMap[slug]) {
      return NextResponse.json({
        url: fallbackTrailerMap[slug],
        watchUrl: fallbackTrailerMap[slug],
        from: "seed-fallback",
      });
    }

    // Final fallback: generic MP4
    const genericMp4 =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    return NextResponse.json({
      url: genericMp4,
      watchUrl: genericMp4,
      from: "generic-fallback",
    });
  } catch (error) {
    console.error("Trailer lookup failed", error);
    return NextResponse.json(
      { message: "Trailer lookup failed" },
      { status: 500 },
    );
  }
}
