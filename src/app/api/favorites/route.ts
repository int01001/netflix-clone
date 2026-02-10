import { NextRequest, NextResponse } from "next/server";
import { getFavorites, toggleFavorite } from "@/lib/data";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const favorites = await getFavorites(user.id);
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Failed to load favorites", error);
    return NextResponse.json(
      { message: "Unable to load favorites." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { movieId, tmdbId } = await req.json();
  if (
    (!movieId || Number.isNaN(Number(movieId))) &&
    (!tmdbId || Number.isNaN(Number(tmdbId)))
  ) {
    return NextResponse.json(
      { message: "movieId or tmdbId is required" },
      { status: 400 },
    );
  }

  try {
    const result = await toggleFavorite(
      user.id,
      movieId ? Number(movieId) : undefined,
      tmdbId ? Number(tmdbId) : undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update favorites", error);
    return NextResponse.json(
      { message: "Unable to update favorites." },
      { status: 500 },
    );
  }
}
