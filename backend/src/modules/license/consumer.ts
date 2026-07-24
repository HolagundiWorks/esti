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
  const row = await getOrgSettings(db);

  if (env.ESTI_LICENSE_API_URL) {
    // HCW License Manager path: activate against /v1 and store the panel token
    // (licenseState understands both manager and legacy hub formats).
    const licenseToken = await activateViaPanel(key, installId);
    await db
      .update(orgSettings)
      .set({
        licenseToken,
        installId,
        licenceStatus: "ACTIVE",
        licenseCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orgSettings.id, row.id));
    return toLicenseView(await licenseState(db));
  }

  const grant = await postHub<LicenseGrant>("/api/license/activate", {
    key: key.trim(),
    installId,
    fingerprint: null,
  });
  await db
    .update(orgSettings)
    .set({
      licenseToken: grant.licenseToken,
      syncToken: grant.syncToken,
      installId: grant.installId,
      licenceStatus: "ACTIVE",
      licenseCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orgSettings.id, row.id));
  return toLicenseView(await licenseState(db));
}

/** Activate a key against the HCW License Manager `/v1/activate`; returns the
 *  signed panel license token. Throws on a bad key or an unreachable manager. */
export async function activateViaPanel(key: string, deviceId: string): Promise<string> {
  const base = env.ESTI_LICENSE_API_URL.replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/v1/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ESTI_PRODUCT_API_KEY}`,
      },
      body: JSON.stringify({ licenseKey: key.trim(), deviceId }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Could not reach the license service." });
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
  return (JSON.parse(text) as { licenseToken: string }).licenseToken;
}

/** Re-fetch a fresh token from the hub (extends grace). Returns false if not possible/offline. */
export async function refreshNow(db: DB): Promise<boolean> {
  const row = await getOrgSettings(db);
  if (!row.licenseToken || !row.installId) return false;

  if (env.ESTI_LICENSE_API_URL) {
    try {
      const base = env.ESTI_LICENSE_API_URL.replace(/\/+$/, "");
      const res = await fetch(`${base}/v1/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.ESTI_PRODUCT_API_KEY}`,
        },
        body: JSON.stringify({ token: row.licenseToken, deviceId: row.installId }),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      if (!res.ok) {
        // P7.3 — panel refuses suspended/revoked licences; stamp local hold so
        // writes stop even while the cached token is still within offline TTL.
        let reason = "";
        try {
          reason = (JSON.parse(text) as { error?: string }).error ?? "";
        } catch {
          /* keep empty */
        }
        if (reason === "suspended" || reason === "revoked") {
          await db
            .update(orgSettings)
            .set({
              licenceStatus: "SUSPENDED",
              licenseCheckedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(orgSettings.id, row.id));
        }
        return false;
      }
      const data = JSON.parse(text) as { licenseToken: string };
      await db
        .update(orgSettings)
        .set({
          licenseToken: data.licenseToken,
          licenceStatus: "ACTIVE",
          licenseCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orgSettings.id, row.id));
      return true;
    } catch {
      // Offline / panel down is expected — that is what the grace window is for.
      return false;
    }
  }

  if (!env.ESTI_HUB_URL) return false;
  try {
    const res = await postHub<{ licenseToken: string }>("/api/license/refresh", {
      installId: row.installId,
      licenseToken: row.licenseToken,
    });
    await db
      .update(orgSettings)
      .set({
        licenseToken: res.licenseToken,
        licenceStatus: "ACTIVE",
        licenseCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orgSettings.id, row.id));
    return true;
  } catch {
    // Offline / hub down is expected — that is what the grace window is for.
    return false;
  }
}
