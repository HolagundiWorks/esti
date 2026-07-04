import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "../env.js";

const LOCK_PATH = join(tmpdir(), "aorms-community.lock");

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Community single-instance / install lock. Refuses to start when another live
 * Community instance already holds the machine lock — one install per machine.
 * A stale lock (dead pid) is reclaimed. No-op outside COMMUNITY or when
 * ESTI_INSTALL_LOCK=off (support override). The Tauri shell adds a native
 * single-instance guard on top of this.
 */
export function acquireCommunityInstanceLock(): void {
  if (env.ESTI_EDITION !== "COMMUNITY") return;
  if (process.env.ESTI_INSTALL_LOCK === "off") return;

  if (existsSync(LOCK_PATH)) {
    const pid = Number(readFileSync(LOCK_PATH, "utf8").trim());
    if (pid && pid !== process.pid && isAlive(pid)) {
      throw new Error(
        `Another AORMS Community instance is already running on this machine (pid ${pid}). ` +
          `Only one install per machine is allowed — set ESTI_INSTALL_LOCK=off to override.`,
      );
    }
  }
  writeFileSync(LOCK_PATH, String(process.pid), "utf8");

  const release = () => {
    try {
      if (existsSync(LOCK_PATH) && readFileSync(LOCK_PATH, "utf8").trim() === String(process.pid)) {
        unlinkSync(LOCK_PATH);
      }
    } catch {
      /* best effort */
    }
  };
  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    release();
    process.exit(0);
  });
}

/** Reachable http URLs on the LAN (IPv4, non-internal), for the host to share. */
export function lanUrls(port: number): string[] {
  const out: string[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === "IPv4" && !i.internal) out.push(`http://${i.address}:${port}`);
    }
  }
  return out;
}
