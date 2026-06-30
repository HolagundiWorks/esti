import { and, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { newId, newLicenseKey } from "../../lib/ids.js";
import type { AccountView } from "../auth/service.js";

// Self-serve onboarding: when a customer signs up from a product (AORMS/esti, …)
// we give them a personal organization and a time-limited trial license, all
// stored centrally here so the admin Licenses GUI manages them like any other.

const TRIAL_DAYS = 14;

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

/** The account's own org — reuse the one they own, else create one. */
async function ensurePersonalOrg(account: AccountView): Promise<string> {
  const [owned] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.ownerAccountId, account.id))
    .limit(1);
  if (owned) return owned.id;

  const base = account.name?.trim() || account.email.split("@")[0] || "workspace";
  let slug = slugify(base);
  const [clash] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, slug))
    .limit(1);
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const orgId = newId("org");
  await db.insert(schema.organizations).values({
    id: orgId,
    name: account.name ? `${account.name}'s workspace` : `${base}'s workspace`,
    slug,
    billingEmail: account.email,
    ownerAccountId: account.id,
  });
  await db
    .insert(schema.orgMembers)
    .values({ id: newId("mem"), orgId, accountId: account.id, role: "OWNER" })
    .onConflictDoNothing();
  return orgId;
}

async function findPlan(productCode: string, planCode: string) {
  const [row] = await db
    .select({
      productId: schema.products.id,
      productCode: schema.products.code,
      planId: schema.plans.id,
      planCode: schema.plans.code,
      seats: schema.plans.seats,
      deviceLimit: schema.plans.deviceLimit,
      meterLimit: schema.plans.meterLimit,
    })
    .from(schema.plans)
    .innerJoin(schema.products, eq(schema.products.id, schema.plans.productId))
    .where(and(eq(schema.products.code, productCode), eq(schema.plans.code, planCode)))
    .limit(1);
  return row ?? null;
}

export interface ProvisionResult {
  orgId: string;
  licenseId: string;
  key: string;
  status: string;
  productCode: string;
  planCode: string;
  expiresAt: string | null;
  reused: boolean;
}

/**
 * Idempotently provision a trial. If the org already holds a non-revoked license
 * for the product, that license is returned unchanged (re-signups are safe).
 */
export async function provisionTrial(
  account: AccountView,
  productCode = "AORMS",
  planCode = "TRIAL",
): Promise<ProvisionResult | null> {
  const plan = await findPlan(productCode, planCode);
  if (!plan) return null;

  const orgId = await ensurePersonalOrg(account);

  const [existing] = await db
    .select()
    .from(schema.licenses)
    .where(and(eq(schema.licenses.orgId, orgId), eq(schema.licenses.productId, plan.productId)))
    .limit(1);
  if (existing && existing.status !== "REVOKED") {
    return {
      orgId,
      licenseId: existing.id,
      key: existing.key,
      status: existing.status,
      productCode: plan.productCode,
      planCode,
      expiresAt: existing.expiresAt ? existing.expiresAt.toISOString() : null,
      reused: true,
    };
  }

  const id = newId("lic");
  const expiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const [created] = await db
    .insert(schema.licenses)
    .values({
      id,
      orgId,
      productId: plan.productId,
      planId: plan.planId,
      key: newLicenseKey(),
      status: "TRIAL",
      seats: plan.seats,
      deviceLimit: plan.deviceLimit,
      meterLimit: plan.meterLimit,
      expiresAt,
      notes: "Self-serve trial",
    })
    .returning();
  await db.insert(schema.licenseEvents).values({
    id: newId("evt"),
    licenseId: id,
    type: "CREATE",
    actor: account.email,
    meta: { via: "self_serve", product: plan.productCode, plan: planCode },
  });

  return {
    orgId,
    licenseId: id,
    key: created!.key,
    status: "TRIAL",
    productCode: plan.productCode,
    planCode,
    expiresAt: expiresAt.toISOString(),
    reused: false,
  };
}
