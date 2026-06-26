import { randomBytes } from "node:crypto";
import { type LicenseGrant, type LicenseView } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { orgSettings } from "../../db/schema.js";
import { env } from "../../env.js";
import { licenseState, toLicenseView } from "../../lib/plan.js";
import { getOrgSettings } from "../../lib/settings.js";

/** Resolve this install's stable id, persisting one (or the desktop-injected one) if absent. */
export async function getOrCreateInstallId(db: DB): Promise<string> {
  const row = await getOrgSettings(db);
  if (row.installId) return row.installId;
  const id = env.INSTALL_ID || `web-${randomBytes(12).toString("base64url")}`;
  await db
    .update(orgSettings)
    .set({ installId: id, updatedAt: new Date() })
    .where(eq(orgSettings.id, row.id));
  return id;
}

function assertHubConfigured(): string {
  if (!env.ESTI_HUB_URL) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No licensing hub is configured for this install (ESTI_HUB_URL).",
    });
  }
  return env.ESTI_HUB_URL.replace(/\/+$/, "");
}

async function postHub<T>(path: string, body: unknown): Promise<T> {
  const base = assertHubConfigured();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Could not reach the licensing hub." });
  }
  const text = await res.text();
  if (!res.ok) {
    let message = "Activation failed";
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? message;
    } catch {
      /* keep default */
    }
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
  return JSON.parse(text) as T;
}

/** Activate a key against the hub, persist the grant, return the new license view. */
export async function activate(db: DB, key: string): Promise<LicenseView> {
  const installId = await getOrCreateInstallId(db);
  const grant = await postHub<LicenseGrant>("/api/license/activate", {
    key: key.trim(),
    installId,
    fingerprint: null,
  });
  const row = await getOrgSettings(db);
  await db
    .update(orgSettings)
    .set({
      licenseToken: grant.licenseToken,
      syncToken: grant.syncToken,
      installId: grant.installId,
      licenseCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orgSettings.id, row.id));
  return toLicenseView(await licenseState(db));
}

/** Re-fetch a fresh token from the hub (extends grace). Returns false if not possible/offline. */
export async function refreshNow(db: DB): Promise<boolean> {
  if (!env.ESTI_HUB_URL) return false;
  const row = await getOrgSettings(db);
  if (!row.licenseToken || !row.installId) return false;
  try {
    const res = await postHub<{ licenseToken: string }>("/api/license/refresh", {
      installId: row.installId,
      licenseToken: row.licenseToken,
    });
    await db
      .update(orgSettings)
      .set({ licenseToken: res.licenseToken, licenseCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(orgSettings.id, row.id));
    return true;
  } catch {
    // Offline / hub down is expected — that is what the grace window is for.
    return false;
  }
}
