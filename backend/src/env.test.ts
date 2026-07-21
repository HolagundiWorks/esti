import { describe, expect, it } from "vitest";
import { assertProductionSecrets, type Env } from "./env.js";

const base: Env = {
  NODE_ENV: "production",
  BACKEND_PORT: 4000,
  SESSION_SECRET: "prod-secret-min-16-chars",
  COOKIE_SECURE: true,
  ALLOWED_ORIGINS: "https://aorms.in",
  DATABASE_URL: "postgres://app:strong-pass@db:5432/esti",
  REDIS_URL: "redis://redis:6379",
  WORKER_JOB_STREAM: "esti:jobs",
  BUILD_REVISION: "abc123",
  S3_ENDPOINT: "http://minio:9000",
  S3_PUBLIC_ENDPOINT: "https://aorms.in/s3",
  S3_BUCKET: "esti-documents",
  S3_ACCESS_KEY: "access",
  S3_SECRET_KEY: "strong-s3-secret",
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_FROM: "AORMS <hi@aorms.in>",
  BETA_REQUEST_NOTIFY_TO: "hi@aorms.in",
  DEMO_MASTER_PASSWORD: "prod-demo-master-not-default",
  ESTI_RELAX_AUTH_LIMITS: false,
};

describe("assertProductionSecrets", () => {
  it("allows a properly configured production env", () => {
    expect(() => assertProductionSecrets(base)).not.toThrow();
  });

  it("rejects the default session secret", () => {
    expect(() =>
      assertProductionSecrets({ ...base, SESSION_SECRET: "dev-session-secret-change-me" }),
    ).toThrow(/SESSION_SECRET/);
  });

  it("rejects default database credentials", () => {
    expect(() =>
      assertProductionSecrets({ ...base, DATABASE_URL: "postgres://esti:esti@localhost:5432/esti" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("requires secure cookies in production", () => {
    expect(() => assertProductionSecrets({ ...base, COOKIE_SECURE: false })).toThrow(/COOKIE_SECURE/);
  });

  it("rejects the default demo master password", () => {
    expect(() =>
      assertProductionSecrets({ ...base, DEMO_MASTER_PASSWORD: "aorms-demo-admin" }),
    ).toThrow(/DEMO_MASTER_PASSWORD/);
  });

  it("skips checks in development", () => {
    expect(() =>
      assertProductionSecrets({
        ...base,
        NODE_ENV: "development",
        SESSION_SECRET: "dev-session-secret-change-me",
        COOKIE_SECURE: false,
      }),
    ).not.toThrow();
  });
});
