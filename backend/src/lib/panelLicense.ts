import { createPublicKey, verify as edVerify, type KeyObject } from "node:crypto";
import { Plan, PLAN_LIMITS, type Plan as PlanT, type ResolvedSeats } from "@esti/contracts";
import { z } from "zod";

/**
 * Verifier for license tokens issued by the central **Holagundi License Panel**
 * (separate repo `holagundi-license-panel`). The panel signs entitlement tokens
 * with its own Ed25519 key; the matching **public key is embedded here** so this
 * install verifies them offline — exactly as {@link verifyLicense} does for the
 * legacy ESTI hub format. AORMS plan codes (LITE/CORE/ENTERPRISE) map 1:1 onto
 * ESTI's {@link Plan}.
 *
 * Keep this constant in sync with the panel's `backend/src/lib/license.ts`.
 */
const PANEL_PUBLIC_KEY_SPKI_DER_B64 =
  "MCowBQYDK2VwAyEA66A1kjGLoHXX6TWOgyUlQPv394xT9SJ+bjDSNsoxenk=";

const PanelTokenPayload = z.object({
  v: z.literal(1),
  jti: z.string(),
  licenseId: z.string(),
  orgId: z.string(),
  productCode: z.string(),
  planCode: z.string(),
  status: z.string(),
  seats: z.number().int().nullable(),
  deviceLimit: z.number().int().nullable(),
  meterLimit: z.number().int().nullable(),
  features: z.array(z.string()),
  deviceId: z.string(),
  issuedAt: z.number().int(), // epoch seconds
  exp: z.number().int(), // epoch seconds
});
export type PanelTokenPayload = z.infer<typeof PanelTokenPayload>;

let cachedKey: KeyObject | null = null;
function publicKey(): KeyObject {
  if (!cachedKey) {
    cachedKey = createPublicKey({
      key: Buffer.from(PANEL_PUBLIC_KEY_SPKI_DER_B64, "base64"),
      format: "der",
      type: "spki",
    });
  }
  return cachedKey;
}

export type PanelVerify =
  | { ok: true; payload: PanelTokenPayload }
  | { ok: false; reason: string };

/** Verify a panel token (`base64url(payload).base64url(sig)`). Pure / offline. */
export function verifyPanelToken(token: string | null | undefined): PanelVerify {
  if (!token) return { ok: false, reason: "missing" };
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "malformed" };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const parsed = PanelTokenPayload.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid payload" };

  let signatureOk = false;
  try {
    signatureOk = edVerify(
      null,
      Buffer.from(payloadB64),
      publicKey(),
      Buffer.from(sigB64, "base64url"),
    );
  } catch {
    return { ok: false, reason: "bad signature" };
  }
  if (!signatureOk) return { ok: false, reason: "bad signature" };
  return { ok: true, payload: parsed.data };
}

export interface PanelDerived {
  plan: PlanT;
  seats: ResolvedSeats;
  firmId: string;
  issuedAtIso: string;
  expiresAtIso: string;
  expMs: number;
}

/**
 * Map a verified panel token onto ESTI's plan/seat model. Returns `null` for a
 * plan code ESTI does not understand (e.g. a non-AORMS product). The panel's
 * single `seats` number is the staff cap; accountant/HR seats fall back to the
 * plan defaults.
 */
export function panelDerived(p: PanelTokenPayload): PanelDerived | null {
  const planResult = Plan.safeParse(p.planCode);
  if (!planResult.success) return null;
  const plan = planResult.data;
  const base = PLAN_LIMITS[plan];
  return {
    plan,
    seats: {
      staff: p.seats ?? base.staff,
      accountants: base.accountants,
      hrManagers: base.hrManagers,
    },
    firmId: p.orgId,
    issuedAtIso: new Date(p.issuedAt * 1000).toISOString(),
    expiresAtIso: new Date(p.exp * 1000).toISOString(),
    expMs: p.exp * 1000,
  };
}
