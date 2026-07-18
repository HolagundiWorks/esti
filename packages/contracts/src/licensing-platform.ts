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

/**
 * Looks up a portable AORMS-U handle on the hub — the machine-to-machine half of
 * the U-3 "sync protocol" (see docs/esti/AORMS-IDENTITY.md §11). A node's own
 * local `hlp_account` table is a per-install schema shadow, not the real store —
 * real accounts live only on the hub, so linking a firm login to one has to ask
 * the hub over `/v1`, the same way license activation and delegated login already do.
 */
export const VerifyIdentityInput = z.object({ publicId: z.string().min(1) });
export type VerifyIdentityInput = z.infer<typeof VerifyIdentityInput>;

export const VerifyIdentityResult = z.object({
  account: z.object({
    publicId: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
});
export type VerifyIdentityResult = z.infer<typeof VerifyIdentityResult>;

/**
 * Pushes a node's derived `userType()` for a linked person up to the hub
 * membership record — the other half of the U-3b sync protocol. `company` is
 * the node's own AORMS-C handle (same field `verify-login` already takes),
 * used to find the (account, org) membership row to stamp.
 */
export const SyncMembershipInput = z.object({
  publicId: z.string().min(1),
  company: z.string().min(1),
  accountType: z.enum(["STAFF", "COMPANY", "CLIENT", "CONSULTANT", "CONTRACTOR"]),
});
export type SyncMembershipInput = z.infer<typeof SyncMembershipInput>;

/**
 * Records a portable growth/learning signal on a person's hub identity — the
 * ASPRF/LXOS seam (`hlp_growth_event`). A node calls this for a linked person
 * (I-5 `account_public_id`) when they complete something worth remembering
 * across firms, e.g. an LXOS Academy SOP module. `company` scopes an org-bound
 * key the same way `sync-membership` does; a legacy product-wide key may omit it.
 */
export const RecordGrowthInput = z.object({
  publicId: z.string().min(1),
  company: z.string().min(1).optional(),
  kind: z.string().min(1).max(80),
  value: z.record(z.string(), z.unknown()).default({}),
});
export type RecordGrowthInput = z.infer<typeof RecordGrowthInput>;

// --- Desktop component manifest (Manager ⇄ hub) ---
//
// The desktop Manager ships as a thin bootstrapper; the actual app is pulled
// online as versioned "components". A signed manifest tells the Manager exactly
// what to download for its edition and how to verify each artifact. It is signed
// with the same Ed25519 key that signs licence tokens, so the Manager verifies
// it offline against the embedded public key — downloaded code is never trusted
// without a signature + per-artifact hash check.

/** Which dependency layer a component belongs to. LITE pulls only `core`. */
export const ComponentKind = z.enum(["core", "ai", "worker"]);
export type ComponentKind = z.infer<typeof ComponentKind>;

/** One downloadable artifact (backend sidecar, embedded Postgres, SPA, Ollama, model, worker…). */
export const ManifestComponent = z.object({
  /** Stable identifier, e.g. "backend", "postgres", "spa", "ollama", "model", "worker". */
  id: z.string().min(1),
  version: z.string().min(1),
  kind: ComponentKind,
  /** HTTPS download URL (e.g. a GitHub Release asset). */
  url: z.string().url(),
  /** Lowercase hex SHA-256 of the artifact — the Manager verifies before executing. */
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
});
export type ManifestComponent = z.infer<typeof ManifestComponent>;

/** The full set of components an edition must download to run. */
export const ComponentManifest = z.object({
  /** Manifest wire-format version (bump on breaking shape changes). */
  schemaVersion: z.literal(1),
  edition: z.enum(["LITE", "PRO"]),
  /** The app release this manifest describes (e.g. "2026.7.0"). */
  appVersion: z.string().min(1),
  issuedAt: z.string(), // ISO 8601
  components: z.array(ManifestComponent),
});
export type ComponentManifest = z.infer<typeof ComponentManifest>;

/** A node asks the hub for the manifest matching its licence. */
export const ManifestRequest = z.object({ licenseKey: z.string().min(1) });
export type ManifestRequest = z.infer<typeof ManifestRequest>;

/** Hub response: the manifest plus its detached `base64url(payload).base64url(sig)` token. */
export const ManifestResult = z.object({
  manifest: ComponentManifest,
  /** Signed token (same format as a licence token) the Manager verifies offline. */
  signed: z.string().min(1),
});
export type ManifestResult = z.infer<typeof ManifestResult>;
