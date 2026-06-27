import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().default(4000),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
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
  DESKTOP: z.coerce.boolean().default(false),
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
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** From header, e.g. "AORMS Beta <hi@aorms.in>" */
  SMTP_FROM: z.string().default("AORMS Beta <hi@aorms.in>"),
  /** Inbox that receives every beta form submission. */
  BETA_REQUEST_NOTIFY_TO: z.string().default("hi@aorms.in"),
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
}

const parsed = Env.parse(process.env);
assertProductionSecrets(parsed);
export const env = parsed;
