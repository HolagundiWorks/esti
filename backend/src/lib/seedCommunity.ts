import { createHash, randomBytes } from "node:crypto";
import { count } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import type { DB } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../env.js";

/** The documented Community first-run credential (must be rotated on first login). */
export const COMMUNITY_ADMIN_USERNAME = "admin";
export const COMMUNITY_ADMIN_PASSWORD = "Admin00@";

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/** Human-readable backup code, e.g. "7F3K-9Q2M-4B8X". */
export function generateBackupCode(): string {
  const raw = randomBytes(9).toString("hex").toUpperCase(); // 18 hex chars
  return (raw.match(/.{1,4}/g) ?? []).slice(0, 3).join("-");
}

/**
 * Community edition first-run: seed the single admin (OWNER) with the documented
 * default credential and a one-time backup recovery code, when the install is
 * empty. The admin must rotate the password on first login. The default password
 * and the backup code are printed to the server console once so the operator can
 * hand them over. No-op outside COMMUNITY or when any user already exists.
 */
export async function seedCommunityAdmin(db: DB): Promise<void> {
  if (env.ESTI_EDITION !== "COMMUNITY") return;
  const [row] = await db.select({ n: count() }).from(users);
  if (Number(row?.n ?? 0) > 0) return;

  const backupCode = generateBackupCode();
  await db.insert(users).values({
    email: COMMUNITY_ADMIN_USERNAME,
    fullName: "Administrator",
    role: "OWNER",
    passwordHash: await hashPassword(COMMUNITY_ADMIN_PASSWORD),
    mustChangePassword: true,
    backupCodeHash: hashBackupCode(backupCode),
  });

  // eslint-disable-next-line no-console
  console.log(
    `[AORMS Community] First-run admin created — username "${COMMUNITY_ADMIN_USERNAME}", ` +
      `password "${COMMUNITY_ADMIN_PASSWORD}" (must be changed on first login).`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `[AORMS Community] Backup recovery code: ${backupCode} — the only offline recovery path; store it safely.`,
  );
}
