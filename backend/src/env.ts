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
  S3_ENDPOINT: z.string().default("http://minio:9000"),
  // Browser-reachable endpoint used only to sign GET URLs (presign is host-bound).
  S3_PUBLIC_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_BUCKET: z.string().default("esti-documents"),
  S3_ACCESS_KEY: z.string().default("esti"),
  S3_SECRET_KEY: z.string().default("esti-secret"),
});

export const env = Env.parse(process.env);
export type Env = z.infer<typeof Env>;
