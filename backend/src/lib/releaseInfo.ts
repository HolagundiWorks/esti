import { sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { env } from "../env.js";
import { redis } from "./redis.js";
import { storageHealthy } from "./storage.js";

const APP_VERSION = "0.0.0";

export type ReleaseInfo = {
  app: string;
  version: string;
  revision: string;
  nodeEnv: string;
  builtAt: string | null;
  checks: {
    db: boolean;
    redis: boolean;
    storage: boolean;
  };
};

export async function buildReleaseInfo(db: DB): Promise<ReleaseInfo> {
  const checks = { db: false, redis: false, storage: false };
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = true;
  } catch {
    /* intentional */
  }
  try {
    await redis.ping();
    checks.redis = true;
  } catch {
    /* intentional */
  }
  try {
    checks.storage = await storageHealthy();
  } catch {
    /* intentional */
  }

  return {
    app: "ESTI AORMS",
    version: APP_VERSION,
    revision: env.BUILD_REVISION,
    nodeEnv: env.NODE_ENV,
    builtAt: env.BUILD_TIME ?? null,
    checks,
  };
}

export function releaseSummary(info: ReleaseInfo): { ok: boolean } & ReleaseInfo {
  const ok = info.checks.db && info.checks.redis;
  return { ok, ...info };
}
