import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";

export const SESSION_COOKIE = "esti_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a session and return the opaque cookie token (store hash only). */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "OWNER" | "CONSULTANT" | "CLIENT";
}

/** Resolve a cookie token to a live user, or null. */
export async function userFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return (rows[0] as AuthUser | undefined) ?? null;
}
