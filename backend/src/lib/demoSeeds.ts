import { eq, like, or } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import type { DB } from "../db/index.js";
import { users } from "../db/schema.js";
import { syncDemoUploadPassword } from "./uploadSecurity.js";

/** Plain-text password for all @demo.aorms.in logins (from VPS .env). */
export function demoPasswordFromEnv(): string {
  return process.env.SEED_DEMO_PASSWORD ?? "demo1234";
}

export function isDemoAormsEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@demo.aorms.in");
}

/** Align every demo login + upload gate to SEED_DEMO_PASSWORD (idempotent). */
export async function syncDemoLoginPasswords(
  db: DB,
  plainPassword?: string,
): Promise<number> {
  const password = plainPassword ?? demoPasswordFromEnv();
  const pwHash = await hashPassword(password);
  const updated = await db
    .update(users)
    .set({ passwordHash: pwHash, isDemo: true, mustCompleteWorkspaceProfile: false })
    .where(or(eq(users.isDemo, true), like(users.email, "%@demo.aorms.in")))
    .returning({ id: users.id });
  await syncDemoUploadPassword(db, password);
  return updated.length;
}

/** Ensure a single demo owner row exists with the correct hash (seed:prod helper). */
export async function syncDemoOwnerPassword(
  db: DB,
  email: string,
  plainPassword?: string,
): Promise<void> {
  if (!isDemoAormsEmail(email)) return;
  const password = plainPassword ?? demoPasswordFromEnv();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), isDemo: true })
    .where(eq(users.email, email));
  await syncDemoUploadPassword(db, password);
}
