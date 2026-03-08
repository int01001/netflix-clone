import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { execute, query } from "@/lib/db";
import { hashPassword, signSession, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type OtpRow = {
  id: number;
  email: string;
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

    const rows = await query<OtpRow[]>(
      "SELECT id, email, otp_hash, expires_at, used_at FROM email_verification_otps WHERE email = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [email],
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

    // Create user account (email verified)
    const password = (await query<{ password: string }[]>(
      "SELECT password FROM temp_signup_passwords WHERE email = ? LIMIT 1",
      [email],
    ))[0]?.password;

    if (!password) {
      return NextResponse.json({ message: "Session expired. Please sign up again." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const result = await execute(
      "INSERT INTO users (email, password_hash, name, is_pending_profile) VALUES (?, ?, ?, TRUE)",
      [email, passwordHash, "New User"],
    );

    // Mark OTP as used
    await execute(
      "UPDATE email_verification_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
      [record.id],
    );

    // Clean up temp password
    await execute("DELETE FROM temp_signup_passwords WHERE email = ?", [email]);

    const token = signSession({
      userId: result.insertId,
      email,
      name: "pending-profile",
    });

    const response = NextResponse.json({ token });
    response.cookies.set({
      ...sessionCookieOptions,
      value: token,
    });

    return response;
  } catch (error) {
    console.error("Failed to verify signup", error);
    return NextResponse.json(
      { message: "Unable to verify code right now." },
      { status: 500 },
    );
  }
}
