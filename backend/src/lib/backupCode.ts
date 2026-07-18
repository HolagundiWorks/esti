import { createHash, randomBytes } from "node:crypto";

/** One-time offline recovery codes (auth.recoverWithBackupCode). */

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/** Human-readable backup code, e.g. "7F3K-9Q2M-4B8X". */
export function generateBackupCode(): string {
  const raw = randomBytes(9).toString("hex").toUpperCase(); // 18 hex chars
  return (raw.match(/.{1,4}/g) ?? []).slice(0, 3).join("-");
}
