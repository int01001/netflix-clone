import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { signupSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await query<{ id: number }[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (existing.length) {
      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const result = await execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash],
    );

    const token = signSession({ userId: result.insertId, email, name });
    const response = NextResponse.json(
      { user: { id: result.insertId, name, email } },
      { status: 201 },
    );
    response.cookies.set({
      ...sessionCookieOptions,
      value: token,
    });

    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json(
      { message: "Unable to sign up right now." },
      { status: 500 },
    );
  }
}
