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
  /** Outbound mail for beta-request notifications (Google Workspace / SMTP). */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("AORMS Beta <hi@aorms.in>"),
  BETA_REQUEST_NOTIFY_TO: z.string().default("hi@aorms.in"),
});

export const env = Env.parse(process.env);
export type Env = z.infer<typeof Env>;
