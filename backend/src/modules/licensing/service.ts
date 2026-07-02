import { createHash, randomBytes } from "node:crypto";
import {
  asPlan,
  type LicenseGrant,
  type LicensePayload,
  type LicenseRefreshResult,
  type LicenseSeats,
} from "@esti/contracts";
import { and, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { licenseInstalls, licenses } from "../../db/schema.js";
import { env } from "../../env.js";
import { signLicense, verifyLicense } from "../../lib/license.js";

/** Token lifetime; a node refreshes well before this, so this is the offline ceiling. */
const GRANT_DAYS = 30;

/** A client-facing activation/refresh failure (REST maps to 400). */
export class LicenseAuthorityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenseAuthorityError";
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Customer-facing key, e.g. ESTI-3F7K-9Q2M-X8RA-LP4D (Crockford-ish base32, no I/L/O/U). */
export function generateActivationKey(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return `ESTI-${out}`;
}

type LicenseRow = typeof licenses.$inferSelect;

function seatsOf(row: LicenseRow): LicenseSeats | undefined {
  const s = (row.seats ?? {}) as LicenseSeats;
  return Object.keys(s).length ? s : undefined;
}

function mintToken(row: LicenseRow, installId: string): string {
  if (!env.LICENSE_SIGNING_KEY) {
    throw new LicenseAuthorityError("Hub is not configured to issue licenses");
  }
  const now = Date.now();
  const payload: LicensePayload = {
    v: 1,
    firmId: row.firmId,
    installId,
    plan: asPlan(row.plan),
    seats: seatsOf(row),
    issuedAt: new Date(now).toISOString(),
    exp: new Date(now + GRANT_DAYS * 864e5).toISOString(),
  };
  return signLicense(payload, env.LICENSE_SIGNING_KEY);
}

function assertUsable(row: LicenseRow): void {
  if (row.status !== "ACTIVE") {
    throw new LicenseAuthorityError(`License is ${row.status.toLowerCase()}`);
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    throw new LicenseAuthorityError("License entitlement has expired");
  }
}

/** Activate a key for an install: bind the install, mint a token + a sync bearer. */
export async function activateLicense(
  db: DB,
  input: { key: string; installId: string; fingerprint?: string },
): Promise<LicenseGrant> {
  const [row] = await db.select().from(licenses).where(eq(licenses.key, input.key)).limit(1);
  if (!row) throw new LicenseAuthorityError("Unknown activation key");
  assertUsable(row);

  const syncToken = randomBytes(32).toString("base64url");
  const [existing] = await db
    .select()
    .from(licenseInstalls)
    .where(
      and(eq(licenseInstalls.licenseId, row.id), eq(licenseInstalls.installId, input.installId)),
    )
    .limit(1);

  if (existing) {
    await db
      .update(licenseInstalls)
      .set({
        syncTokenHash: sha256(syncToken),
        fingerprint: input.fingerprint ?? null,
        lastSeenAt: new Date(),
      })
      .where(eq(licenseInstalls.id, existing.id));
  } else {
    const bound = await db
      .select({ id: licenseInstalls.id })
      .from(licenseInstalls)
      .where(eq(licenseInstalls.licenseId, row.id));
    if (bound.length >= row.maxInstalls) {
      throw new LicenseAuthorityError("This license has reached its install limit");
    }
    await db.insert(licenseInstalls).values({
      licenseId: row.id,
      installId: input.installId,
      syncTokenHash: sha256(syncToken),
      fingerprint: input.fingerprint ?? null,
      lastSeenAt: new Date(),
    });
  }

  return { licenseToken: mintToken(row, input.installId), syncToken, installId: input.installId };
}

/** Re-issue a fresh token (extends offline grace). Honors SUSPENDED/REVOKED/expiry. */
export async function refreshLicense(
  db: DB,
  input: { installId: string; licenseToken: string },
): Promise<LicenseRefreshResult> {
  const v = verifyLicense(input.licenseToken);
  if (!v.ok) throw new LicenseAuthorityError("Invalid license token");
  const [row] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.firmId, v.payload.firmId))
    .limit(1);
  if (!row) throw new LicenseAuthorityError("Unknown license");
  assertUsable(row);

  const [inst] = await db
    .select({ id: licenseInstalls.id })
    .from(licenseInstalls)
    .where(
      and(eq(licenseInstalls.licenseId, row.id), eq(licenseInstalls.installId, input.installId)),
    )
    .limit(1);
  if (!inst) throw new LicenseAuthorityError("This install is not activated");
  await db
    .update(licenseInstalls)
    .set({ lastSeenAt: new Date() })
    .where(eq(licenseInstalls.id, inst.id));

  return { licenseToken: mintToken(row, input.installId), installId: input.installId };
}
