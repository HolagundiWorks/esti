import { and, desc, eq } from "drizzle-orm";
import { sendMail } from "../../../lib/mail/transport.js";
import { db, schema } from "../../db/client.js";
import { env } from "../../env.js";
import { newId, newLicenseKey } from "../../lib/ids.js";
import { type AccountView, getAccountById } from "../auth/service.js";
import { ensurePersonalOrg } from "../onboarding/service.js";

export const PLAN_CODES = ["LITE", "CORE", "ENTERPRISE"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

const PLAN_DEFS: Record<PlanCode, { name: string; seats: number | null; deviceLimit: number | null }> = {
  LITE: { name: "AORMS Lite", seats: 3, deviceLimit: 3 },
  CORE: { name: "AORMS Core", seats: 15, deviceLimit: 15 },
  ENTERPRISE: { name: "AORMS Enterprise", seats: null, deviceLimit: null },
};

async function findPlan(planCode: string) {
  const [row] = await db
    .select({
      productId: schema.products.id,
      planId: schema.plans.id,
      seats: schema.plans.seats,
      deviceLimit: schema.plans.deviceLimit,
      meterLimit: schema.plans.meterLimit,
    })
    .from(schema.plans)
    .innerJoin(schema.products, eq(schema.products.id, schema.plans.productId))
    .where(and(eq(schema.products.code, "AORMS"), eq(schema.plans.code, planCode)))
    .limit(1);
  return row ?? null;
}

/** Ensure the AORMS product + the requested plan exist (idempotent self-heal). */
async function ensureAormsPlan(planCode: PlanCode) {
  const existing = await findPlan(planCode);
  if (existing) return existing;
  let [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.code, "AORMS"))
    .limit(1);
  if (!product) {
    await db
      .insert(schema.products)
      .values({ id: newId("prod"), code: "AORMS", name: "AORMS", kind: "APP" })
      .onConflictDoNothing();
    [product] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.code, "AORMS"))
      .limit(1);
  }
  const def = PLAN_DEFS[planCode];
  await db
    .insert(schema.plans)
    .values({ id: newId("plan"), productId: product!.id, code: planCode, name: def.name, seats: def.seats, deviceLimit: def.deviceLimit })
    .onConflictDoNothing();
  return (await findPlan(planCode))!;
}

export interface PlanRequestRow {
  id: string;
  email: string;
  planCode: string;
  status: string;
  note: string | null;
  licenseId: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  decidedBy: string | null;
}

/** Raise (or update the pending) plan request for a person. */
export async function createPlanRequest(
  account: AccountView,
  planCode: PlanCode,
): Promise<PlanRequestRow> {
  const [pending] = await db
    .select()
    .from(schema.planRequests)
    .where(and(eq(schema.planRequests.accountId, account.id), eq(schema.planRequests.status, "PENDING")))
    .limit(1);
  if (pending) {
    const [u] = await db
      .update(schema.planRequests)
      .set({ planCode })
      .where(eq(schema.planRequests.id, pending.id))
      .returning();
    return u!;
  }
  const [created] = await db
    .insert(schema.planRequests)
    .values({ id: newId("req"), accountId: account.id, email: account.email, planCode })
    .returning();
  return created!;
}

/** The account's latest request (drives the console status card). */
export async function myRequest(accountId: string): Promise<PlanRequestRow | null> {
  const [row] = await db
    .select()
    .from(schema.planRequests)
    .where(eq(schema.planRequests.accountId, accountId))
    .orderBy(desc(schema.planRequests.createdAt))
    .limit(1);
  return row ?? null;
}

/** Admin portal queue — newest first, with the requester's name. */
export async function listRequests() {
  return db
    .select({
      id: schema.planRequests.id,
      email: schema.planRequests.email,
      name: schema.accounts.name,
      accountPublicId: schema.accounts.publicId,
      planCode: schema.planRequests.planCode,
      status: schema.planRequests.status,
      note: schema.planRequests.note,
      licenseId: schema.planRequests.licenseId,
      createdAt: schema.planRequests.createdAt,
      decidedBy: schema.planRequests.decidedBy,
      decidedAt: schema.planRequests.decidedAt,
    })
    .from(schema.planRequests)
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.planRequests.accountId))
    .orderBy(desc(schema.planRequests.createdAt));
}

export async function pendingRequestCount(): Promise<number> {
  const rows = await db
    .select({ id: schema.planRequests.id })
    .from(schema.planRequests)
    .where(eq(schema.planRequests.status, "PENDING"));
  return rows.length;
}

function licenseEmail(planCode: string, key: string) {
  // The account portal is merged into /login (a "Create account" tab there) —
  // there is no separate /account URL to send someone to.
  const accountUrl = `${env.FRONTEND_ORIGIN}/login`;
  const subject = `Your AORMS ${planCode} licence`;
  const text = `Your AORMS ${planCode} licence is ready.

Licence key: ${key}

Activate it in your AORMS install (Company → Licence → Activate). Manage your account,
companies, and credentials at ${accountUrl}.

— AORMS`;
  const html = `<p>Your AORMS <strong>${planCode}</strong> licence is ready.</p>
<p><strong>Licence key:</strong> <code>${key}</code></p>
<p>Activate it in your AORMS install (Company → Licence → Activate). Manage your account,
companies, and credentials at <a href="${accountUrl}">${accountUrl}</a>.</p>
<p>— AORMS</p>`;
  return { subject, text, html };
}

/**
 * Fulfil a request: create the licence on the requested plan (perpetual, ACTIVE),
 * mark the request fulfilled, and email the key to the requester from the portal.
 */
export async function fulfilRequest(
  requestId: string,
  adminEmail: string,
): Promise<{ ok: true; key: string; emailed: boolean; emailReason?: string } | { ok: false; error: string }> {
  const [req] = await db
    .select()
    .from(schema.planRequests)
    .where(eq(schema.planRequests.id, requestId))
    .limit(1);
  if (!req) return { ok: false, error: "not_found" };
  if (req.status !== "PENDING") return { ok: false, error: "already_decided" };
  if (!PLAN_CODES.includes(req.planCode as PlanCode)) return { ok: false, error: "bad_plan" };

  const account = await getAccountById(req.accountId);
  if (!account) return { ok: false, error: "account_gone" };

  const plan = await ensureAormsPlan(req.planCode as PlanCode);
  const orgId = await ensurePersonalOrg(account);

  // Reuse a live licence for this org+product if one exists, else create.
  const [existing] = await db
    .select()
    .from(schema.licenses)
    .where(and(eq(schema.licenses.orgId, orgId), eq(schema.licenses.productId, plan.productId)))
    .limit(1);
  let licenseId: string;
  let key: string;
  if (existing && existing.status !== "REVOKED") {
    licenseId = existing.id;
    key = existing.key;
    await db
      .update(schema.licenses)
      .set({ planId: plan.planId, seats: plan.seats, deviceLimit: plan.deviceLimit, status: "ACTIVE", updatedAt: new Date() })
      .where(eq(schema.licenses.id, existing.id));
  } else {
    licenseId = newId("lic");
    key = newLicenseKey();
    await db.insert(schema.licenses).values({
      id: licenseId,
      orgId,
      productId: plan.productId,
      planId: plan.planId,
      key,
      status: "ACTIVE",
      seats: plan.seats,
      deviceLimit: plan.deviceLimit,
      meterLimit: plan.meterLimit,
      expiresAt: null,
      notes: `Fulfilled request (${req.planCode})`,
    });
  }
  await db.insert(schema.licenseEvents).values({
    id: newId("evt"),
    licenseId,
    type: "CREATE",
    actor: adminEmail,
    meta: { via: "request_fulfil", plan: req.planCode, requestId },
  });
  await db
    .update(schema.planRequests)
    .set({ status: "FULFILLED", licenseId, orgId, decidedBy: adminEmail, decidedAt: new Date() })
    .where(eq(schema.planRequests.id, requestId));

  const mail = licenseEmail(req.planCode, key);
  const res = await sendMail({ to: req.email, ...mail });
  return { ok: true, key, emailed: res.sent, emailReason: res.reason };
}

export async function rejectRequest(
  requestId: string,
  adminEmail: string,
  note?: string,
): Promise<{ ok: boolean }> {
  await db
    .update(schema.planRequests)
    .set({ status: "REJECTED", decidedBy: adminEmail, decidedAt: new Date(), note: note ?? null })
    .where(and(eq(schema.planRequests.id, requestId), eq(schema.planRequests.status, "PENDING")));
  return { ok: true };
}
