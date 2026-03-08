import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { execute, query } from "@/lib/db";
import { hashPassword, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type UserRow = { id: number; email: string };

type OtpRow = {
  id: number;
  user_id: number;
  expires_at: string;
  used_at: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const session = verifySession(token);
    if (!session || session.name !== "password-reset") {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const users = await query<UserRow[]>(
      "SELECT id, email FROM users WHERE id = ? LIMIT 1",
      [session.userId],
    );
    const user = users[0];
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const rows = await query<OtpRow[]>(
      "SELECT id, user_id, expires_at, used_at FROM password_reset_otps WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [user.id],
    );
    const record = rows[0];
    if (!record) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const expiresAt = new Date(record.expires_at).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      return NextResponse.json({ message: "Code expired" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      user.id,
    ]);

    await execute(
      "UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
      [record.id],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset password", error);
    return NextResponse.json(
      { message: "Unable to reset password right now." },
      { status: 500 },
    );
  }
}
