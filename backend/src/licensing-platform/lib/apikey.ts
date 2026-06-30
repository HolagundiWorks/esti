import { createHash } from "node:crypto";

/** Product API keys are stored only as a SHA-256 hash; the plaintext is shown
 *  once at creation. */
export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}
