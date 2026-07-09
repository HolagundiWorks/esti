import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../env.js";

const execFileAsync = promisify(execFile);

let resetInFlight = false;
let lastResetIstDay = "";

/** IST calendar date YYYY-MM-DD for midnight scheduling. */
export function istDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Force re-seed the demo workspace (same as auth.resetDemo / SEED_DEMO_FORCE=1). */
export async function runDemoSeedForce(log?: FastifyBaseLogger): Promise<void> {
  if (resetInFlight) return;
  resetInFlight = true;
  try {
    await execFileAsync("pnpm", ["seed:demo"], {
      cwd: process.cwd(),
      env: { ...process.env, SEED_DEMO_FORCE: "1" },
      timeout: 120_000,
    });
    log?.info("demo workspace re-seeded");
  } catch (err) {
    log?.error(err, "demo seed failed");
    throw err;
  } finally {
    resetInFlight = false;
  }
}

/**
 * Call every minute — re-seeds demo data once per IST day at 00:00 (first 2 minutes).
 */
export async function tickDemoMidnightReset(log: FastifyBaseLogger): Promise<void> {
  if (!env.DEMO_MIDNIGHT_RESET) return;
  const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  if (istNow.getHours() !== 0 || istNow.getMinutes() >= 2) return;
  const day = istDateKey();
  if (lastResetIstDay === day) return;
  lastResetIstDay = day;
  log.info({ day }, "IST midnight — resetting demo workspace");
  await runDemoSeedForce(log);
}
