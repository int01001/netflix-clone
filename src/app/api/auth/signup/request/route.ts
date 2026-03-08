import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { execute, query } from "@/lib/db";
import { sendWelcomeVerificationEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

type UserRow = { id: number; email: string };

const OTP_TTL_MINUTES = 10;

const hashOtp = (otp: string) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await query<UserRow[]>(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length) {
      // Allow re‑verification if the user exists but has no preferences (i.e., incomplete signup)
      const prefs = await query<{ id: number }[]>(
        "SELECT id FROM user_preferences WHERE user_id = ? LIMIT 1",
        [existing[0].id],
      );
      if (prefs.length) {
        return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
      }
      // Otherwise, allow re‑verification (delete old user and continue)
      await execute("DELETE FROM users WHERE id = ?", [existing[0].id]);
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await execute(
      "UPDATE email_verification_otps SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND used_at IS NULL",
      [email],
    );

    await execute(
      "INSERT INTO email_verification_otps (email, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE)) ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), used_at = NULL",
      [email, otpHash, OTP_TTL_MINUTES],
    );

    await sendWelcomeVerificationEmail({ to: email, otp });

    await execute(
      "INSERT INTO temp_signup_passwords (email, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)",
      [email, password],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to request signup verification", error);
    return NextResponse.json(
      { message: "Unable to send code right now." },
      { status: 500 },
    );
  }
}
