import { and, desc, eq, ne } from "drizzle-orm";
import { STANDARD_LICENCE_LABEL, STANDARD_PLAN_CODE } from "@esti/contracts";
import { sendMail } from "../../../lib/mail/transport.js";
import { db, schema } from "../../db/client.js";
import { env } from "../../env.js";
import { newId, newLicenseKey } from "../../lib/ids.js";
import { getAormsStandardPlanRow } from "../../lib/standardPlan.js";
import { type AccountView, getAccountById } from "../auth/service.js";
import { ensurePersonalOrg } from "../onboarding/service.js";

/** Single edition — legacy tier codes fold here on fulfilment. */
export const PLAN_CODES = [STANDARD_PLAN_CODE] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

/** Fold any requested/legacy code to STANDARD. */
export function normalizePlanCode(_code: string): PlanCode {
  return STANDARD_PLAN_CODE;
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

/**
 * The active licence for the account's own org (drives the "Current plan" card
 * in the account portal). Returns plan code + seat/device caps + expiry, or null
 * if the account owns no org / holds no non-revoked licence yet.
 */
export async function myLicense(accountId: string): Promise<{
  planCode: string;
  productCode: string;
  status: string;
  seats: number | null;
  deviceLimit: number | null;
  expiresAt: string | null;
} | null> {
  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.ownerAccountId, accountId))
    .limit(1);
  if (!org) return null;
  const [row] = await db
    .select({
      planCode: schema.plans.code,
      productCode: schema.products.code,
      status: schema.licenses.status,
      seats: schema.licenses.seats,
      deviceLimit: schema.licenses.deviceLimit,
      expiresAt: schema.licenses.expiresAt,
    })
    .from(schema.licenses)
    .innerJoin(schema.plans, eq(schema.plans.id, schema.licenses.planId))
    .innerJoin(schema.products, eq(schema.products.id, schema.licenses.productId))
    .where(and(eq(schema.licenses.orgId, org.id), ne(schema.licenses.status, "REVOKED")))
    .orderBy(desc(schema.licenses.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    planCode: row.planCode,
    productCode: row.productCode,
    status: row.status,
    seats: row.seats,
    deviceLimit: row.deviceLimit,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
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

function licenseEmail(key: string) {
  const accountUrl = `${env.FRONTEND_ORIGIN}/login`;
  const subject = `Your ${STANDARD_LICENCE_LABEL} licence`;
  const text = `Your ${STANDARD_LICENCE_LABEL} licence is ready.

Licence key: ${key}

Activate it in your AORMS install (Company → Licence → Activate). Manage your account,
companies, and credentials at ${accountUrl}.

— AORMS`;
  const html = `<p>Your <strong>${STANDARD_LICENCE_LABEL}</strong> licence is ready.</p>
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

  const planCode = normalizePlanCode(req.planCode);
  const account = await getAccountById(req.accountId);
  if (!account) return { ok: false, error: "account_gone" };

  const plan = await getAormsStandardPlanRow();
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
      notes: `Fulfilled request (${planCode})`,
    });
  }
  await db.insert(schema.licenseEvents).values({
    id: newId("evt"),
    licenseId,
    type: "CREATE",
    actor: adminEmail,
    meta: { via: "request_fulfil", plan: planCode, requestId },
  });
  await db
    .update(schema.planRequests)
    .set({ status: "FULFILLED", licenseId, orgId, decidedBy: adminEmail, decidedAt: new Date() })
    .where(eq(schema.planRequests.id, requestId));

  const mail = licenseEmail(key);
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
