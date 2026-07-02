import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { newId } from "../../lib/ids.js";

export interface CertificationRow {
  id: string;
  title: string;
  issuer: string | null;
  issuedAt: Date | null;
  evidenceKey: string | null;
  status: string;
}

/** Certifications a person holds (across every company). Newest first. */
export async function listCertifications(accountPublicId: string): Promise<CertificationRow[]> {
  return db
    .select({
      id: schema.certifications.id,
      title: schema.certifications.title,
      issuer: schema.certifications.issuer,
      issuedAt: schema.certifications.issuedAt,
      evidenceKey: schema.certifications.evidenceKey,
      status: schema.certifications.status,
    })
    .from(schema.certifications)
    .where(eq(schema.certifications.accountPublicId, accountPublicId))
    .orderBy(desc(schema.certifications.createdAt));
}

/** Issue a certification to a person (by AORMS-U handle). */
export async function issueCertification(input: {
  accountPublicId: string;
  title: string;
  issuer?: string | null;
  issuedAt?: Date | null;
  evidenceKey?: string | null;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(schema.certifications)
    .values({
      id: newId("cert"),
      accountPublicId: input.accountPublicId,
      title: input.title,
      issuer: input.issuer ?? null,
      issuedAt: input.issuedAt ?? new Date(),
      evidenceKey: input.evidenceKey ?? null,
    })
    .returning({ id: schema.certifications.id });
  return row!;
}

/** Flip a certification's status (ACTIVE ↔ REVOKED). */
export async function setCertificationStatus(
  id: string,
  status: "ACTIVE" | "REVOKED",
): Promise<void> {
  await db.update(schema.certifications).set({ status }).where(eq(schema.certifications.id, id));
}

export interface GrowthRow {
  id: string;
  kind: string;
  value: Record<string, unknown>;
  orgPublicId: string | null;
  at: Date;
}

/** The person's growth / learning timeline (across companies). Newest first. */
export async function listGrowth(accountPublicId: string): Promise<GrowthRow[]> {
  return db
    .select({
      id: schema.growthEvents.id,
      kind: schema.growthEvents.kind,
      value: schema.growthEvents.value,
      orgPublicId: schema.growthEvents.orgPublicId,
      at: schema.growthEvents.at,
    })
    .from(schema.growthEvents)
    .where(eq(schema.growthEvents.accountPublicId, accountPublicId))
    .orderBy(desc(schema.growthEvents.at));
}

/**
 * Record a growth signal on a person. The seam that ASPRF / LXOS feed into so
 * performance + learning accrue to the individual, not the firm they were at.
 */
export async function recordGrowth(input: {
  accountPublicId: string;
  kind: string;
  value?: Record<string, unknown>;
  orgPublicId?: string | null;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(schema.growthEvents)
    .values({
      id: newId("grw"),
      accountPublicId: input.accountPublicId,
      kind: input.kind,
      value: input.value ?? {},
      orgPublicId: input.orgPublicId ?? null,
    })
    .returning({ id: schema.growthEvents.id });
  return row!;
}

/** Resolve an account's AORMS-U handle from its internal id (for self views). */
export async function publicIdForAccount(accountId: string): Promise<string | null> {
  const [row] = await db
    .select({ publicId: schema.accounts.publicId })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);
  return row?.publicId ?? null;
}

/** Resolve an account id from an AORMS-U handle (for admin issuance by handle). */
export async function accountIdFromPublicId(accountPublicId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(and(eq(schema.accounts.publicId, accountPublicId.trim().toUpperCase())))
    .limit(1);
  return row?.id ?? null;
}
