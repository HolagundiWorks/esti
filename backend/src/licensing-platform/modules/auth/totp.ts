import { eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { generateTotpSecret, otpauthUri, verifyTotp } from "../../lib/totp.js";

/** Begin enrollment: a fresh secret + the otpauth URI to scan. Not persisted until
 *  the account proves possession with a valid code via {@link enableTotp}. */
export function startEnrollment(email: string): { secret: string; otpauthUrl: string } {
  const secret = generateTotpSecret();
  return { secret, otpauthUrl: otpauthUri(secret, email) };
}

/** Confirm + turn on 2FA: the code must validate against the just-issued secret. */
export async function enableTotp(
  accountId: string,
  secret: string,
  code: string,
): Promise<boolean> {
  if (!verifyTotp(secret, code)) return false;
  await db
    .update(schema.accounts)
    .set({ totpSecret: secret, updatedAt: new Date() })
    .where(eq(schema.accounts.id, accountId));
  return true;
}

/** Turn off 2FA — requires a current code so a hijacked session can't disable it. */
export async function disableTotp(accountId: string, code: string): Promise<boolean> {
  const [a] = await db
    .select({ totpSecret: schema.accounts.totpSecret })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);
  if (!a?.totpSecret) return true; // already off
  if (!verifyTotp(a.totpSecret, code)) return false;
  await db
    .update(schema.accounts)
    .set({ totpSecret: null, updatedAt: new Date() })
    .where(eq(schema.accounts.id, accountId));
  return true;
}

export async function totpEnabled(accountId: string): Promise<boolean> {
  const [a] = await db
    .select({ totpSecret: schema.accounts.totpSecret })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);
  return Boolean(a?.totpSecret);
}

/** Login check: null → no secret to fetch; otherwise verify the supplied code. */
export async function checkTotpForLogin(
  accountId: string,
  code: string | undefined,
): Promise<"not_required" | "ok" | "required" | "invalid"> {
  const [a] = await db
    .select({ totpSecret: schema.accounts.totpSecret })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);
  if (!a?.totpSecret) return "not_required";
  if (!code) return "required";
  return verifyTotp(a.totpSecret, code) ? "ok" : "invalid";
}
