import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().default(4000),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().default("postgres://esti:esti@localhost:5432/esti"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WORKER_JOB_STREAM: z.string().default("esti:jobs"),
});

export const env = Env.parse(process.env);
export type Env = z.infer<typeof Env>;
