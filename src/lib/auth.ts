import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_DAYS = 7;

export type SessionPayload = {
  userId: number;
  email: string;
  name?: string;
};

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.warn(
      "AUTH_SECRET is not set. Using a weak development secret. Set AUTH_SECRET for production.",
    );
  }
  return secret ?? "dev-secret";
};

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, 10);

export const comparePasswords = async (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);

export const signSession = (payload: SessionPayload) =>
  jwt.sign(payload, getSecret(), { expiresIn: `${SESSION_DAYS}d` });

export const verifySession = (token: string): SessionPayload | null => {
  try {
    return jwt.verify(token, getSecret()) as SessionPayload;
  } catch {
    return null;
  }
};

export const sessionCookieOptions = {
  name: "session",
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
  secure: process.env.NODE_ENV === "production",
};
