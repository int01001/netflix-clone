import { NextRequest, NextResponse } from "next/server";
import {
  comparePasswords,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { query } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

type UserRow = User & { password_hash: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const users = await query<UserRow[]>(
      "SELECT id, name, email, password_hash, avatar_url AS avatarUrl FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    const user = users[0];
    if (!user) {
      return NextResponse.json(
        { message: "No account found for that email." },
        { status: 404 },
      );
    }

    const valid = await comparePasswords(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { message: "Password is incorrect." },
        { status: 401 },
      );
    }

    const token = signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
    response.cookies.set({
      ...sessionCookieOptions,
      value: token,
    });

    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json(
      { message: "Unable to log in right now." },
      { status: 500 },
    );
  }
}
