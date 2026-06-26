import { z } from "zod";
import { Plan } from "./plans.js";

/**
 * Licensing (Phase B). A license is a signed token issued by the central hub
 * (the vendor VPS) that carries the firm's plan + seat entitlements. Every
 * install (desktop or web) verifies it offline against an embedded public key;
 * the plan is **derived from the license**, not self-served.
 *
 * Token wire format: `base64url(JSON payload) "." base64url(Ed25519 signature)`.
 * The signature covers the exact `base64url(payload)` bytes (no re-canonicalise).
 */

/**
 * Per-seat caps the license may carry. Each field overrides the plan default
 * from `PLAN_LIMITS` when present; `null` means **unlimited**, `undefined`
 * means "use the plan default".
 */
export const LicenseSeats = z.object({
  staff: z.number().int().nonnegative().nullable().optional(),
  accountants: z.number().int().nonnegative().nullable().optional(),
  hrManagers: z.number().int().nonnegative().nullable().optional(),
});
export type LicenseSeats = z.infer<typeof LicenseSeats>;

/** The signed payload. `issuedAt`/`exp` are ISO-8601 strings. */
export const LicensePayload = z.object({
  /** Schema version of the payload. */
  v: z.literal(1),
  /** The firm this license is bound to (matches `esti_firm.id` on the node). */
  firmId: z.string().min(1),
  /** The install this token was activated for (anti-share). */
  installId: z.string().min(1),
  plan: Plan,
  /** Optional seat overrides; absent → plan defaults apply. */
  seats: LicenseSeats.optional(),
  issuedAt: z.string().min(1),
  /** Hard expiry; after this the install enters the offline grace window. */
  exp: z.string().min(1),
});
export type LicensePayload = z.infer<typeof LicensePayload>;

/** Effective license state on an install, surfaced to the gate + UI. */
export const LicenseStatus = z.enum(["VALID", "GRACE", "EXPIRED", "UNLICENSED"]);
export type LicenseStatus = z.infer<typeof LicenseStatus>;

/** Resolved effective seat caps (after applying license overrides to plan defaults). */
export const ResolvedSeats = z.object({
  staff: z.number().int().nonnegative().nullable(),
  accountants: z.number().int().nonnegative().nullable(),
  hrManagers: z.number().int().nonnegative().nullable(),
});
export type ResolvedSeats = z.infer<typeof ResolvedSeats>;

/** What `license.status` returns to the SPA (no secrets — token/sig never sent). */
export const LicenseView = z.object({
  status: LicenseStatus,
  plan: Plan,
  seats: ResolvedSeats,
  firmId: z.string().nullable(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  /** Days of read/write grace left once past `exp`; null when not in grace. */
  graceDaysLeft: z.number().int().nullable(),
  /** Writes are currently rejected (managed install, lapsed/absent licence). */
  blocked: z.boolean(),
});
export type LicenseView = z.infer<typeof LicenseView>;

/** Activation request (install → hub). */
export const LicenseActivateInput = z.object({
  key: z.string().min(1),
});
export type LicenseActivateInput = z.infer<typeof LicenseActivateInput>;

/** What the hub returns on activate/refresh. `syncToken` is the install's bearer for sync. */
export const LicenseGrant = z.object({
  licenseToken: z.string().min(1),
  syncToken: z.string().min(1),
  installId: z.string().min(1),
});
export type LicenseGrant = z.infer<typeof LicenseGrant>;

/** What the hub returns on refresh (sync token is not rotated — node keeps its own). */
export const LicenseRefreshResult = z.object({
  licenseToken: z.string().min(1),
  installId: z.string().min(1),
});
export type LicenseRefreshResult = z.infer<typeof LicenseRefreshResult>;

/** License authority status values (hub-side `esti_license.status`). */
export const LicenseKeyStatus = z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]);
export type LicenseKeyStatus = z.infer<typeof LicenseKeyStatus>;
