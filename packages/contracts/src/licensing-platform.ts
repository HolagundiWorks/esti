// Holagundi licensing platform — central account/org/product/license model,
// merged into AORMS (2026-06-28). Issues Ed25519-signed entitlement tokens that
// products verify offline. NOTE: the license-lifecycle enum is `LicenseLifecycle`
// here (ACTIVE/TRIAL/…) to avoid clashing with the consumer-side `LicenseStatus`
// (VALID/GRACE/…) in license.ts.
import { z } from "zod";

/** A product is either an installable app or a metered API. */
export const ProductKind = z.enum(["APP", "API"]);
export type ProductKind = z.infer<typeof ProductKind>;

/** What a plan meters its primary limit in. */
export const MeterUnit = z.enum(["seats", "api_calls", "students"]);
export type MeterUnit = z.infer<typeof MeterUnit>;

/** Lifecycle of a license (an org's entitlement to a product/plan). */
export const LicenseLifecycle = z.enum([
  "ACTIVE",
  "TRIAL",
  "SUSPENDED",
  "REVOKED",
  "EXPIRED",
]);
export type LicenseLifecycle = z.infer<typeof LicenseLifecycle>;

/** An activated device bound to a license. */
export const DeviceStatus = z.enum(["ACTIVE", "REVOKED"]);
export type DeviceStatus = z.infer<typeof DeviceStatus>;

/** A person's role within an organization. */
export const OrgRole = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export type OrgRole = z.infer<typeof OrgRole>;

/** Per-product machine-key state for the Product License API. */
export const ApiKeyStatus = z.enum(["ACTIVE", "REVOKED"]);
export type ApiKeyStatus = z.infer<typeof ApiKeyStatus>;

/** Immutable license-event audit kinds. */
export const LicenseEventType = z.enum([
  "CREATE",
  "ACTIVATE",
  "REFRESH",
  "REVOKE",
  "SUSPEND",
  "REINSTATE",
  "EXTEND",
  "DEACTIVATE_DEVICE",
]);
export type LicenseEventType = z.infer<typeof LicenseEventType>;

/**
 * The signed entitlement token a product receives from `/v1/activate` (and
 * `/v1/refresh`). Products verify it offline against the platform's embedded
 * Ed25519 public key, so a product keeps working between heartbeats.
 * `seats` / `deviceLimit` / `meterLimit`: `null` means unlimited.
 */
export const LicenseTokenPayload = z.object({
  v: z.literal(1),
  jti: z.string().min(1),
  licenseId: z.string().min(1),
  orgId: z.string().min(1),
  productCode: z.string().min(1),
  planCode: z.string().min(1),
  status: LicenseLifecycle,
  seats: z.number().int().nullable(),
  deviceLimit: z.number().int().nullable(),
  meterLimit: z.number().int().nullable(),
  features: z.array(z.string()),
  deviceId: z.string().min(1),
  issuedAt: z.number().int(), // epoch seconds
  exp: z.number().int(), // epoch seconds
});
export type LicenseTokenPayload = z.infer<typeof LicenseTokenPayload>;

/** The plain entitlement view (what a product can do right now). */
export const Entitlement = z.object({
  licenseId: z.string(),
  orgId: z.string(),
  orgName: z.string(),
  productCode: z.string(),
  planCode: z.string(),
  status: LicenseLifecycle,
  seats: z.number().int().nullable(),
  deviceLimit: z.number().int().nullable(),
  meterLimit: z.number().int().nullable(),
  features: z.array(z.string()),
  expiresAt: z.string().nullable(), // ISO 8601, or null = perpetual
});
export type Entitlement = z.infer<typeof Entitlement>;

// --- Product License API (`/v1`) request/response DTOs ---

export const ActivateInput = z.object({
  licenseKey: z.string().min(1),
  deviceId: z.string().min(1),
  fingerprint: z.string().optional(),
  deviceName: z.string().optional(),
});
export type ActivateInput = z.infer<typeof ActivateInput>;

export const ActivateResult = z.object({
  licenseToken: z.string(),
  entitlement: Entitlement,
});
export type ActivateResult = z.infer<typeof ActivateResult>;

export const ValidateInput = z.object({ token: z.string().min(1) });
export type ValidateInput = z.infer<typeof ValidateInput>;

export const ValidateResult = z.object({
  valid: z.boolean(),
  reason: z.string().optional(),
  entitlement: Entitlement.optional(),
});
export type ValidateResult = z.infer<typeof ValidateResult>;

export const RefreshInput = z.object({
  token: z.string().min(1),
  deviceId: z.string().min(1),
});
export type RefreshInput = z.infer<typeof RefreshInput>;
