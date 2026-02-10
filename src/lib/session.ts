import { NextRequest } from "next/server";
import { verifySession } from "./auth";
import { query } from "./db";
import type { User } from "./types";

export async function getUserFromRequest(
  req: NextRequest,
): Promise<User | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  const users = await query<User[]>(
    "SELECT id, name, email, avatar_url AS avatarUrl FROM users WHERE id = ? LIMIT 1",
    [payload.userId],
  );

  return users[0] ?? null;
}
