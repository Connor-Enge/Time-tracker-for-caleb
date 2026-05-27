import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { DbUser } from "./schema";

export const COOKIE_NAME = "tt_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env var is required");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string;
  email: string;
  role: "employee" | "admin";
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function getCurrentUser(): Promise<DbUser | null> {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, session.sub)).limit(1);
  return rows[0] ?? null;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
