import { createHash, randomBytes } from "node:crypto";
// Prebuilt native bindings (no node-gyp / build tools needed in the image).
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";

export const SESSION_COOKIE = "esti_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h

export function hashPassword(plain: string): Promise<string> {
  return argonHash(plain); // Argon2id by default
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argonVerify(hash, plain);
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

/** Invalidate a browser session cookie token (logout). */
export async function revokeSessionByToken(
  database: Pick<typeof db, "delete">,
  token: string | undefined,
): Promise<void> {
  if (!token) return;
  await database.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Invalidate every workspace session for a user (e.g. after password reset). */
export async function revokeAllSessionsForUser(
  database: Pick<typeof db, "delete">,
  userId: string,
): Promise<void> {
  await database.delete(sessions).where(eq(sessions.userId, userId));
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  // Staff ladder (OWNER/PARTNER/ACCOUNTANT/HR_MANAGER/SENIOR/ASSOCIATE/VIEWER/SITE_SUPERVISOR)
  // plus the portal roles (CONSULTANT collaborator, CLIENT, CONTRACTOR).
  // See @esti/contracts permissions.
  role:
    | "OWNER"
    | "PARTNER"
    | "ACCOUNTANT"
    | "HR_MANAGER"
    | "SENIOR"
    | "ASSOCIATE"
    | "VIEWER"
    | "SITE_SUPERVISOR"
    | "CONSULTANT"
    | "CLIENT"
    | "CONTRACTOR";
  clientId: string | null;
  consultantId: string | null;
  contractorId: string | null;
  /** Seeded demo workspace — uploads blocked; ESTI agent read-only; credential admin blocked. */
  isDemo: boolean;
  /** Preloaded/community account that must set a new password before doing anything. */
  mustChangePassword: boolean;
  /** Existing installs — confirm critical firm/profile details before workspace access. */
  mustCompleteWorkspaceProfile: boolean;
  /** Installation super-user: seeds, purges, system metadata. Independent of role rank. */
  isSystemAdmin: boolean;
  userCode: string | null;
  designation: string | null;
  photoKey: string | null;
}

/** Resolve a cookie token to a live user, or null. */
export async function userFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      clientId: users.clientId,
      consultantId: users.consultantId,
      contractorId: users.contractorId,
      isDemo: users.isDemo,
      mustChangePassword: users.mustChangePassword,
      mustCompleteWorkspaceProfile: users.mustCompleteWorkspaceProfile,
      isSystemAdmin: users.isSystemAdmin,
      userCode: users.userCode,
      designation: users.designation,
      photoKey: users.photoKey,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.disabled, false),
      ),
    )
    .limit(1);
  return (rows[0] as AuthUser | undefined) ?? null;
}
