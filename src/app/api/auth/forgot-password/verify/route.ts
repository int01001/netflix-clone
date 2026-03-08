import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type UserRow = { id: number; email: string };

type OtpRow = {
  id: number;
  user_id: number;
  otp_hash: string;
  expires_at: string;
  used_at: string | null;
};

const hashOtp = (otp: string) =>
  crypto.createHash("sha256").update(otp).digest("hex");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const otp = String(body.otp ?? "").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and code are required" },
        { status: 400 },
      );
    }

    const users = await query<UserRow[]>(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    const user = users[0];
    if (!user) {
      return NextResponse.json({ message: "Invalid code" }, { status: 400 });
    }

    const rows = await query<OtpRow[]>(
      "SELECT id, user_id, otp_hash, expires_at, used_at FROM password_reset_otps WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [user.id],
    );

    const record = rows[0];
    if (!record) {
      return NextResponse.json({ message: "Invalid code" }, { status: 400 });
    }

    const expiresAt = new Date(record.expires_at).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      return NextResponse.json({ message: "Code expired" }, { status: 400 });
    }

    const match = hashOtp(otp) === record.otp_hash;
    if (!match) {
      return NextResponse.json({ message: "Invalid code" }, { status: 400 });
    }

    const token = signSession({
      userId: user.id,
      email: user.email,
      name: "password-reset",
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Failed to verify password reset", error);
    return NextResponse.json(
      { message: "Unable to verify code right now." },
      { status: 500 },
    );
  }
}
