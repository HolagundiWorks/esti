// Env for the merged licensing platform. Reuses AORMS's DATABASE_URL + the
// shared @fastify/cookie secret (registered by the AORMS app); the platform
// admin session is a distinct cookie (hlp_session). Google OAuth + the Ed25519
// signing key come from env and are never committed.
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";

const envBool = (def = false) =>
  z.preprocess(
    (v) => (typeof v === "string" ? ["true", "1", "yes"].includes(v.trim().toLowerCase()) : v),
    z.boolean().default(def),
  );

function list(name: string): string[] {
  return (process.env[name] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

const PlatformEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgres://esti:esti@localhost:5432/esti"),
  FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  PLATFORM_ADMIN_EMAILS: z.array(z.string()).default([]),
  PLATFORM_ADMIN_DOMAINS: z.array(z.string().min(1)).default(["aorms.in"]),
  DEV_LOGIN: envBool(),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:4000/platform/auth/google/callback"),
  ONBOARD_RETURN_ORIGINS: z.array(z.string().min(1)).default([]),
});

export type PlatformEnv = z.infer<typeof PlatformEnv>;

const parsed = PlatformEnv.parse({
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://esti:esti@localhost:5432/esti",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  PLATFORM_ADMIN_EMAILS: list("PLATFORM_ADMIN_EMAILS"),
  PLATFORM_ADMIN_DOMAINS: (() => {
    const v = list("PLATFORM_ADMIN_DOMAINS");
    return v.length ? v : ["aorms.in"];
  })(),
  DEV_LOGIN: process.env.DEV_LOGIN === "1",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:4000/platform/auth/google/callback",
  ONBOARD_RETURN_ORIGINS: list("ONBOARD_RETURN_ORIGINS"),
});

/** Reject dev-only platform auth shortcuts in production. */
export function assertPlatformProductionEnv(config: PlatformEnv): void {
  if (config.NODE_ENV !== "production") return;
  if (config.DEV_LOGIN) {
    throw new Error("DEV_LOGIN must not be enabled in production");
  }
  if (config.DATABASE_URL.startsWith("postgres://esti:esti@")) {
    throw new Error("DATABASE_URL must not use default dev credentials in production");
  }
}

assertPlatformProductionEnv(parsed);
export const env = parsed;

/** Ed25519 PKCS8 PEM signing key — LICENSE_SIGNING_KEY (inline, \n-escaped) or
 *  LICENSE_SIGNING_KEY_FILE (path). null if unset; /v1 refuses to issue without it. */
export function loadSigningKey(): string | null {
  const inline = process.env.LICENSE_SIGNING_KEY;
  if (inline) return inline.replace(/\n/g, "\n");
  const file = process.env.LICENSE_SIGNING_KEY_FILE;
  if (!file) return null;
  try {
    return readFileSync(isAbsolute(file) ? file : file, "utf8");
  } catch {
    return null;
  }
}
