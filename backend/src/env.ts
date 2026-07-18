import { z } from "zod";

/**
 * Strict env boolean: only "true"/"1"/"yes" (any case) enable the flag.
 * `z.coerce.boolean()` uses JS Boolean() semantics, where the literal string
 * "false" is TRUE — so a `.env` line like `FLAG=false` silently enabled the
 * feature. Every boolean env var must use this instead.
 */
const envBool = (def = false) =>
  z.preprocess(
    (v) => (typeof v === "string" ? ["true", "1", "yes"].includes(v.trim().toLowerCase()) : v),
    z.boolean().default(def),
  );

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().default(4000),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  COOKIE_SECURE: envBool(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  DATABASE_URL: z.string().default("postgres://esti:esti@localhost:5432/esti"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WORKER_JOB_STREAM: z.string().default("esti:jobs"),
  /**
   * Job dispatch backend. "redis" (default, VPS) enqueues to Redis Streams for
   * the Python worker; "inproc" (desktop) runs an in-process stub runner.
   */
  WORKER_MODE: z.enum(["redis", "inproc"]).default("redis"),
  /** When true (native desktop build), loopback HTTP + generated secrets are allowed. */
  DESKTOP: envBool(),
  /**
   * Product edition. COMMUNITY = the free, offline, LAN-only appliance: no
   * licence, no online/hub, no AI, no external portals, a single admin + 3 staff.
   * STANDARD (default) = the licensed Lite/Pro product with those surfaces.
   */
  /**
   * Deployment role (Phase B hybrid). "node" (default) = a firm's local/office
   * install: holds office data + drafts, derives its plan from a license, pushes
   * finalized records to the hub. "hub" = the central vendor VPS: the licensing
   * authority + the multi-firm store that the external portals are served from.
   */
  ESTI_ROLE: z.enum(["node", "hub"]).default("node"),
  /** HUB ONLY — PKCS8 PEM Ed25519 private key used to sign licenses. Never in the repo. */
  LICENSE_SIGNING_KEY: z.string().default(""),
  /** NODE — base URL of the hub (e.g. https://aorms.in) for activation/refresh/sync. Empty = offline-only. */
  ESTI_HUB_URL: z.string().default(""),
  /**
   * NODE — base URL of the central Holagundi License Panel (e.g.
   * https://license.holagundi.com). When set, license activation/refresh use the
   * panel's `/v1` Product License API instead of the legacy hub. Empty = use the hub.
   */
  ESTI_LICENSE_API_URL: z.string().default(""),
  /** NODE — AORMS product API key for the License Panel `/v1` API (Bearer). */
  ESTI_PRODUCT_API_KEY: z.string().default(""),
  /**
   * NODE — when true, firm login is verified against the central identity platform
   * (`ESTI_IDENTITY_URL`) instead of only the local password. Default false keeps the
   * existing local `esti_user` login. If the platform is unreachable, login falls back
   * to the locally-cached password (hybrid offline grace).
   */
  ESTI_IDENTITY_DELEGATE: envBool(),
  /** NODE — base URL of the identity platform for delegated login. Empty → use ESTI_LICENSE_API_URL. */
  ESTI_IDENTITY_URL: z.string().default(""),
  /** NODE — this firm's company handle (AORMS-C-…) — membership is checked against it on delegated login. */
  ESTI_COMPANY: z.string().default(""),
  /**
   * Unified individual accounts (Phase 34) — single-box installs where the
   * licensing platform runs in this same process (aorms.in). When true, the
   * workspace login first verifies credentials against the LOCAL platform
   * account store in-process (no HTTP hop, no product API key), provisioning a
   * workspace user on first login, then falls back to HTTP delegation / the
   * local password. Leave false on ordinary firm nodes: their hlp_ tables are
   * unpopulated shadows, and /platform self-registration would otherwise become
   * a workspace-access path.
   */
  ESTI_UNIFIED_ACCOUNTS: envBool(),
  /** Read/write grace window (days) after a license `exp` before writes are blocked. */
  LICENSE_GRACE_DAYS: z.coerce.number().default(14),
  /** How often (hours) the node re-fetches a fresh license token from the hub. */
  LICENSE_REFRESH_HOURS: z.coerce.number().default(12),
  /** Stable per-install identifier (desktop supplies this; web derives one once). */
  INSTALL_ID: z.string().default(""),
  /**
   * Licence-free standalone plan. When set, the backend pins `orgSettings.plan` to
   * this on boot (desktop = LITE, self-hosted firm = its tier). A verified licence
   * overrides it at runtime. Unset → the plan column is left as-is.
   */
  FIRM_PLAN: z.enum(["LITE", "CORE", "ENTERPRISE"]).optional(),
  BUILD_REVISION: z.string().default("dev"),
  BUILD_TIME: z.string().optional(),
  /**
   * Object-storage backend. "s3" (default, VPS) uses MinIO/S3; "fs" (desktop)
   * stores objects on the local filesystem under STORAGE_DIR and serves them
   * back through the backend's GET /files route.
   */
  STORAGE_DRIVER: z.enum(["s3", "fs"]).default("s3"),
  /** Filesystem object-store root when STORAGE_DRIVER=fs. */
  STORAGE_DIR: z.string().default("./.esti-files"),
  /** Public base the SPA uses to fetch fs-stored files, e.g. http://127.0.0.1:PORT/files. */
  FILES_PUBLIC_BASE: z.string().default("/files"),
  S3_ENDPOINT: z.string().default("http://minio:9000"),
  // Browser-reachable endpoint used only to sign GET URLs (presign is host-bound).
  S3_PUBLIC_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_BUCKET: z.string().default("esti-documents"),
  S3_ACCESS_KEY: z.string().default("esti"),
  S3_SECRET_KEY: z.string().default("esti-secret"),
  /** Outbound SMTP for landing beta-form notifications (any mail host — not Google-specific). */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  /** true for implicit TLS (typical port 465); false for STARTTLS (typical port 587). */
  SMTP_SECURE: envBool(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** From header, e.g. "AORMS Beta <hi@aorms.in>" */
  SMTP_FROM: z.string().default("AORMS Beta <hi@aorms.in>"),
  /** Inbox that receives every beta form submission. */
  BETA_REQUEST_NOTIFY_TO: z.string().default("hi@aorms.in"),
  /** Demo master password — unlocks credential/admin mutations on @demo.aorms.in accounts. */
  DEMO_MASTER_PASSWORD: z.string().default("aorms-demo-admin"),
  /** When false, skip the automatic IST midnight demo re-seed. */
  DEMO_MIDNIGHT_RESET: envBool(true),
  /** Optional shared secret for external uptime probes (`X-Readyz-Token` header). */
  READYZ_PROBE_TOKEN: z.string().default(""),
  /** Legacy: owner/repo for `deploy/fetch-installers.sh` (retired `/download` portal). */
  INSTALLER_REPO: z.string().default("HolagundiWorks/esti"),
  /** Optional GitHub token to raise the unauthenticated 60/hr release-API limit. */
  GITHUB_TOKEN: z.string().default(""),
});

export type Env = z.infer<typeof Env>;

const DEV_SESSION_SECRET = "dev-session-secret-change-me";
const DEV_S3_SECRET = "esti-secret";
const DEV_DATABASE_PREFIX = "postgres://esti:esti@";

/** Reject known dev defaults when running in production. */
export function assertProductionSecrets(config: Env): void {
  if (config.NODE_ENV !== "production") return;
  // The native desktop build runs the backend on loopback HTTP with per-install
  // generated secrets and a filesystem store — the prod-secret asserts (which assume
  // a public TLS deployment with MinIO) don't apply.
  if (config.DESKTOP) return;

  if (config.SESSION_SECRET === DEV_SESSION_SECRET || config.SESSION_SECRET.includes("change-me")) {
    throw new Error("SESSION_SECRET must be set to a strong unique value in production");
  }
  if (config.S3_SECRET_KEY === DEV_S3_SECRET) {
    throw new Error("S3_SECRET_KEY must not use the default dev value in production");
  }
  if (config.DATABASE_URL.startsWith(DEV_DATABASE_PREFIX)) {
    throw new Error("DATABASE_URL must not use default dev credentials in production");
  }
  if (!config.COOKIE_SECURE) {
    throw new Error("COOKIE_SECURE must be true in production");
  }
  if (config.DEMO_MASTER_PASSWORD === "aorms-demo-admin") {
    throw new Error("DEMO_MASTER_PASSWORD must not use the default value in production");
  }
}

const parsed = Env.parse(process.env);
assertProductionSecrets(parsed);
export const env = parsed;
