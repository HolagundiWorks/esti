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
  BUILD_REVISION: z.string().default("dev"),
  BUILD_TIME: z.string().optional(),
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
