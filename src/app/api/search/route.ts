import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://www.omdbapi.com/";

const ensureKey = () => {
  const key = process.env.OMDB_API_KEY;
  if (!key) throw new Error("OMDB_API_KEY is missing");
  return key;
};

const upgradePoster = (url?: string | null) => {
  if (!url) return null;
  return url
    .replace(/SX\d+/i, "SX900")
    .replace(/SY\d+/i, "SY900")
    .replace(/UX\d+/i, "UX900");
};

type OmdbSearchItem = {
  imdbID: string;
  Title: string;
  Year?: string;
  Type?: string;
  Poster?: string;
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const key = ensureKey();
    const url = `${API_URL}?apikey=${key}&s=${encodeURIComponent(q)}&type=movie&page=1`;
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ results: [] }, { status: res.status });
    const data = await res.json();
    if (data.Response === "False") return NextResponse.json({ results: [] });

    const items: OmdbSearchItem[] = data.Search ?? [];
    const results = items.map((m, idx) => {
      const year = m.Year ? Number.parseInt(m.Year, 10) : null;
      const numericId = Number(m.imdbID.replace("tt", "")) || idx;
      const trailerSearch = `https://www.youtube.com/embed?autoplay=1&rel=0&modestbranding=1&controls=1&listType=search&list=${encodeURIComponent(
        `${m.Title} official trailer`,
      )}`;
      return {
        id: numericId,
        imdbId: m.imdbID,
        tmdbId: numericId,
        slug: `${m.imdbID}-${m.Title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: m.Title,
        tagline: null,
        genre: null,
        year,
        durationMinutes: null,
        rating: null,
        description: null,
        backdropUrl: upgradePoster(m.Poster),
        thumbnailUrl: upgradePoster(m.Poster),
        trailerUrl: trailerSearch,
        featured: false,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
