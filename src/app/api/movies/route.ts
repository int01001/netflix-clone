import { NextRequest, NextResponse } from "next/server";
import { getHomeSections } from "@/lib/data";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const sections = await getHomeSections(user?.id);
  return NextResponse.json({ sections, user });
}
