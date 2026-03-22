import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { sendWelcomeVerificationEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

type UserRow = { id: number; email: string };
type PreferenceRow = { id: number };

const OTP_TTL_MINUTES = 10;

const hashOtp = (otp: string) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { message: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query<UserRow[]>(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length) {
      const [prefs] = await connection.query<PreferenceRow[]>(
        "SELECT id FROM user_preferences WHERE user_id = ? LIMIT 1",
        [existing[0].id],
      );

      if (prefs.length) {
        await connection.rollback();
        return NextResponse.json(
          { message: "Email is already registered." },
          { status: 409 },
        );
      }

      await connection.execute("DELETE FROM users WHERE id = ?", [existing[0].id]);
    }

    await connection.execute(
      "UPDATE email_verification_otps SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND used_at IS NULL",
      [email],
    );

    await connection.execute(
      "INSERT INTO email_verification_otps (email, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE)) ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), used_at = NULL",
      [email, otpHash, OTP_TTL_MINUTES],
    );

    await connection.execute(
      "INSERT INTO temp_signup_passwords (email, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)",
      [email, password],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("Failed to prepare signup verification", error);
    return NextResponse.json(
      {
        message:
          "Database connection is not established. Start MySQL and try again.",
      },
      { status: 503 },
    );
  } finally {
    connection.release();
  }

  try {
    await sendWelcomeVerificationEmail({ to: email, otp });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send signup verification email", error);
    return NextResponse.json(
      { message: "Unable to send verification code right now." },
      { status: 502 },
    );
  }
}
