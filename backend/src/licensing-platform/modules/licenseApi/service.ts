import {
  type ActivateInput,
  type ActivateResult,
  type Entitlement,
  type LicenseTokenPayload,
  type ValidateResult,
} from "@esti/contracts";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { loadSigningKey } from "../../env.js";
import { signToken, verifyToken } from "../../lib/license.js";
import { newId } from "../../lib/ids.js";

const TOKEN_TTL_S = 30 * 24 * 3600;

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): ApiResult<never> => ({ ok: false, status, error });

type LicenseRow = typeof schema.licenses.$inferSelect;
type PlanRow = typeof schema.plans.$inferSelect;
type OrgRow = typeof schema.organizations.$inferSelect;
type ProductRow = typeof schema.products.$inferSelect;

interface LicenseCtx {
  lic: LicenseRow;
  org: OrgRow;
  plan: PlanRow;
  product: ProductRow;
}

/** License override wins; else the plan default. `null` at either level = unlimited. */
function effective(licVal: number | null, planVal: number | null): number | null {
  return licVal ?? planVal;
}

function usability(lic: LicenseRow): { ok: boolean; reason?: string } {
  if (lic.status === "REVOKED") return { ok: false, reason: "revoked" };
  if (lic.status === "SUSPENDED") return { ok: false, reason: "suspended" };
  if (lic.status === "EXPIRED") return { ok: false, reason: "expired" };
  if (lic.expiresAt && lic.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true }; // ACTIVE or TRIAL
}

async function loadCtx(
  productId: string,
  by: { key: string } | { id: string },
): Promise<LicenseCtx | null> {
  const where =
    "key" in by
      ? and(eq(schema.licenses.key, by.key), eq(schema.licenses.productId, productId))
      : and(eq(schema.licenses.id, by.id), eq(schema.licenses.productId, productId));
  const [lic] = await db.select().from(schema.licenses).where(where).limit(1);
  if (!lic) return null;
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, lic.orgId))
    .limit(1);
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, lic.planId)).limit(1);
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);
  if (!org || !plan || !product) return null;
  return { lic, org, plan, product };
}

async function effectiveFeatures(licenseId: string, planFeatures: string[]): Promise<string[]> {
  const flags = await db
    .select()
    .from(schema.featureFlags)
    .where(eq(schema.featureFlags.licenseId, licenseId));
  const set = new Set(planFeatures);
  for (const f of flags) {
    if (f.enabled) set.add(f.featureCode);
    else set.delete(f.featureCode);
  }
  return [...set];
}

async function buildEntitlement(ctx: LicenseCtx): Promise<Entitlement> {
  const features = await effectiveFeatures(ctx.lic.id, ctx.plan.featureCodes);
  return {
    licenseId: ctx.lic.id,
    orgId: ctx.org.id,
    orgName: ctx.org.name,
    productCode: ctx.product.code,
    planCode: ctx.plan.code,
    status: ctx.lic.status as Entitlement["status"],
    seats: effective(ctx.lic.seats, ctx.plan.seats),
    deviceLimit: effective(ctx.lic.deviceLimit, ctx.plan.deviceLimit),
    meterLimit: effective(ctx.lic.meterLimit, ctx.plan.meterLimit),
    features,
    expiresAt: ctx.lic.expiresAt ? ctx.lic.expiresAt.toISOString() : null,
  };
}

function signEntitlement(ent: Entitlement, deviceId: string): string {
  const key = loadSigningKey();
  if (!key) throw new Error("signing_key_unavailable");
  const now = Math.floor(Date.now() / 1000);
  const payload: LicenseTokenPayload = {
    v: 1,
    jti: newId("tok"),
    licenseId: ent.licenseId,
    orgId: ent.orgId,
    productCode: ent.productCode,
    planCode: ent.planCode,
    status: ent.status,
    seats: ent.seats,
    deviceLimit: ent.deviceLimit,
    meterLimit: ent.meterLimit,
    features: ent.features,
    deviceId,
    issuedAt: now,
    exp: now + TOKEN_TTL_S,
  };
  return signToken(payload, key);
}

async function writeEvent(
  licenseId: string,
  type: string,
  actor: string,
  meta: Record<string, unknown>,
): Promise<void> {
  await db.insert(schema.licenseEvents).values({ id: newId("evt"), licenseId, type, actor, meta });
}

/** Bind/refresh a device row; enforces the effective device limit for new devices. */
async function bindDevice(
  ctx: LicenseCtx,
  input: ActivateInput,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [dev] = await db
    .select()
    .from(schema.devices)
    .where(and(eq(schema.devices.licenseId, ctx.lic.id), eq(schema.devices.deviceId, input.deviceId)))
    .limit(1);

  if (dev) {
    await db
      .update(schema.devices)
      .set({
        status: "ACTIVE",
        lastSeenAt: new Date(),
        fingerprint: input.fingerprint ?? dev.fingerprint,
        name: input.deviceName ?? dev.name,
      })
      .where(eq(schema.devices.id, dev.id));
    return { ok: true };
  }

  const limit = effective(ctx.lic.deviceLimit, ctx.plan.deviceLimit);
  if (limit !== null) {
    const [row] = await db
      .select({ c: count() })
      .from(schema.devices)
      .where(and(eq(schema.devices.licenseId, ctx.lic.id), eq(schema.devices.status, "ACTIVE")));
    if (Number(row?.c ?? 0) >= limit) return { ok: false, status: 409, error: "device_limit_reached" };
  }
  await db.insert(schema.devices).values({
    id: newId("dev"),
    licenseId: ctx.lic.id,
    deviceId: input.deviceId,
    fingerprint: input.fingerprint ?? null,
    name: input.deviceName ?? null,
    status: "ACTIVE",
    lastSeenAt: new Date(),
  });
  return { ok: true };
}

// --- Public API used by the /v1 routes ---

export async function activate(
  productId: string,
  productCode: string,
  input: ActivateInput,
): Promise<ApiResult<ActivateResult>> {
  const ctx = await loadCtx(productId, { key: input.licenseKey });
  if (!ctx) return fail(404, "license_not_found");
  const u = usability(ctx.lic);
  if (!u.ok) return fail(403, u.reason!);

  const bound = await bindDevice(ctx, input);
  if (!bound.ok) return fail(bound.status, bound.error);

  const entitlement = await buildEntitlement(ctx);
  const licenseToken = signEntitlement(entitlement, input.deviceId);
  await writeEvent(ctx.lic.id, "ACTIVATE", productCode, { deviceId: input.deviceId });
  return { ok: true, data: { licenseToken, entitlement } };
}

export async function validate(productId: string, token: string): Promise<ValidateResult> {
  const v = verifyToken(token);
  if (!v.ok) return { valid: false, reason: v.reason };
  const p = v.payload;
  if (p.exp < Math.floor(Date.now() / 1000)) return { valid: false, reason: "token_expired" };

  const ctx = await loadCtx(productId, { id: p.licenseId });
  if (!ctx) return { valid: false, reason: "license_not_found" };
  const u = usability(ctx.lic);
  if (!u.ok) return { valid: false, reason: u.reason };

  const [dev] = await db
    .select()
    .from(schema.devices)
    .where(and(eq(schema.devices.licenseId, ctx.lic.id), eq(schema.devices.deviceId, p.deviceId)))
    .limit(1);
  if (!dev || dev.status !== "ACTIVE") return { valid: false, reason: "device_revoked" };

  return { valid: true, entitlement: await buildEntitlement(ctx) };
}

export async function refresh(
  productId: string,
  productCode: string,
  token: string,
  deviceId: string,
): Promise<ApiResult<ActivateResult>> {
  const v = verifyToken(token);
  if (!v.ok) return fail(401, v.reason);
  if (v.payload.deviceId !== deviceId) return fail(400, "device_mismatch");

  const ctx = await loadCtx(productId, { id: v.payload.licenseId });
  if (!ctx) return fail(404, "license_not_found");
  const u = usability(ctx.lic);
  if (!u.ok) return fail(403, u.reason!);

  const [dev] = await db
    .select()
    .from(schema.devices)
    .where(and(eq(schema.devices.licenseId, ctx.lic.id), eq(schema.devices.deviceId, deviceId)))
    .limit(1);
  if (!dev || dev.status !== "ACTIVE") return fail(403, "device_revoked");
  await db.update(schema.devices).set({ lastSeenAt: new Date() }).where(eq(schema.devices.id, dev.id));

  const entitlement = await buildEntitlement(ctx);
  const licenseToken = signEntitlement(entitlement, deviceId);
  await writeEvent(ctx.lic.id, "REFRESH", productCode, { deviceId });
  return { ok: true, data: { licenseToken, entitlement } };
}

export async function entitlement(
  productId: string,
  token: string,
): Promise<ApiResult<Entitlement>> {
  const r = await validate(productId, token);
  if (!r.valid || !r.entitlement) return fail(403, r.reason ?? "invalid");
  return { ok: true, data: r.entitlement };
}
