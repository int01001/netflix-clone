import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { execute, query } from "@/lib/db";
import { sendPasswordResetOtpEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

type UserRow = { id: number; name: string; email: string };

const OTP_TTL_MINUTES = 10;

const hashOtp = (otp: string) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const users = await query<UserRow[]>(
      "SELECT id, name, email FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    const user = users[0];
    if (!user) {
      // Avoid leaking account existence.
      return NextResponse.json({ ok: true });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await execute(
      "UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL",
      [user.id],
    );

    await execute(
      "INSERT INTO password_reset_otps (user_id, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [user.id, otpHash, OTP_TTL_MINUTES],
    );

    await sendPasswordResetOtpEmail({ to: user.email, name: user.name, otp });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to request password reset", error);
    return NextResponse.json(
      { message: "Unable to send code right now." },
      { status: 500 },
    );
  }
}
