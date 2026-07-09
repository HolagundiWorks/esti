import { greetingGivenName } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { db as platformDb, schema as platformSchema } from "../licensing-platform/db/client.js";

function parseProfile(raw: unknown): { namePrefix?: string; coaRegistrationNo?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    namePrefix: typeof o.namePrefix === "string" ? o.namePrefix : undefined,
    coaRegistrationNo: typeof o.coaRegistrationNo === "string" ? o.coaRegistrationNo : undefined,
  };
}

/** Platform account profile prefix fields for a workspace user's email (best-effort). */
export async function accountProfileByEmail(
  email: string,
): Promise<{ namePrefix?: string; coaRegistrationNo?: string } | null> {
  const [row] = await platformDb
    .select({ profile: platformSchema.accounts.profile })
    .from(platformSchema.accounts)
    .where(eq(platformSchema.accounts.email, email.trim().toLowerCase()))
    .limit(1);
  return parseProfile(row?.profile);
}

export async function greetingGivenNameForEmail(email: string, fullName: string): Promise<string> {
  const profile = await accountProfileByEmail(email);
  return greetingGivenName(fullName, profile);
}
