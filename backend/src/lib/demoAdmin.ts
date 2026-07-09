import { createHash } from "node:crypto";
import { env } from "../env.js";

const TTL_MS = 1000 * 60 * 60 * 8; // 8h after master-password unlock
const unlockedUntil = new Map<string, number>();

function sessionKey(token: string | undefined): string | null {
  if (!token) return null;
  return createHash("sha256").update(token).digest("hex");
}

/** True when a demo session has been unlocked with the demo master password. */
export function isDemoAdminUnlocked(sessionToken: string | undefined): boolean {
  const key = sessionKey(sessionToken);
  if (!key) return false;
  const exp = unlockedUntil.get(key);
  if (exp == null || exp <= Date.now()) {
    unlockedUntil.delete(key);
    return false;
  }
  return true;
}

export function unlockDemoAdminSession(sessionToken: string | undefined): void {
  const key = sessionKey(sessionToken);
  if (!key) return;
  unlockedUntil.set(key, Date.now() + TTL_MS);
}

export function revokeDemoAdminSession(sessionToken: string | undefined): void {
  const key = sessionKey(sessionToken);
  if (key) unlockedUntil.delete(key);
}

/** Master password for privileged demo changes (env DEMO_MASTER_PASSWORD). */
export function verifyDemoMasterPassword(plain: string): boolean {
  const expected = env.DEMO_MASTER_PASSWORD;
  if (!expected) return false;
  return plain === expected;
}
