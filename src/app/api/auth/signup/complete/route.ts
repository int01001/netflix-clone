import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

type UserRow = { id: number; email: string };

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    console.log("[signup/complete] user from request:", user);
    if (!user || !user.is_pending_profile) {
      console.log("[signup/complete] unauthorized:", { user, condition: !user ? "no user" : !user.is_pending_profile ? "not pending" : "unknown" });
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    console.log("[signup/complete] request body:", body);
    const { name, phone, dateOfBirth, gender, preferred_genres, preferred_languages } = body;

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    if (!Array.isArray(preferred_genres) || preferred_genres.length !== 5) {
      return NextResponse.json({ message: "Select exactly 5 genres" }, { status: 400 });
    }

    if (!Array.isArray(preferred_languages) || preferred_languages.length !== 3) {
      return NextResponse.json({ message: "Select exactly 3 languages" }, { status: 400 });
    }

    await execute("UPDATE users SET name = ?, is_pending_profile = FALSE WHERE id = ?", [name, user.id]);

    await execute(
      `INSERT INTO user_preferences (user_id, name, phone, date_of_birth, gender, preferred_genres, preferred_languages)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       phone = VALUES(phone),
       date_of_birth = VALUES(date_of_birth),
       gender = VALUES(gender),
       preferred_genres = VALUES(preferred_genres),
       preferred_languages = VALUES(preferred_languages)`,
      [
        user.id,
        name,
        phone || null,
        dateOfBirth || null,
        gender || "prefer_not_to_say",
        JSON.stringify(preferred_genres),
        JSON.stringify(preferred_languages),
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to complete profile", error);
    return NextResponse.json(
      { message: "Unable to save profile." },
      { status: 500 },
    );
  }
}
