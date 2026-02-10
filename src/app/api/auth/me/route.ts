import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  return NextResponse.json({ user: user ?? null });
}
