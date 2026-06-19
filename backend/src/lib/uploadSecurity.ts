import { UPLOAD_PASSWORD_FIELD } from "@esti/contracts";
import type { DB } from "../db/index.js";
import { verifyPassword } from "../auth/session.js";
import { getOrgSettings } from "./settings.js";

export const UPLOAD_PASSWORD_REQUIRED_MESSAGE =
  "An upload password is required. Enter the firm upload password to continue.";
export const UPLOAD_PASSWORD_INVALID_MESSAGE = "Incorrect upload password.";
export const UPLOAD_PASSWORD_UNCONFIGURED_MESSAGE =
  "Upload password is required but not configured. Ask your firm owner to set one in Company settings.";

export type UploadPasswordDenial = { status: 403; error: string };

/** Enforce optional firm upload password on REST multipart routes. */
export async function verifyUploadPassword(
  db: DB,
  fields: Record<string, string>,
): Promise<UploadPasswordDenial | null> {
  const settings = await getOrgSettings(db);
  if (!settings.uploadPasswordRequired) return null;

  if (!settings.uploadPasswordHash) {
    return { status: 403, error: UPLOAD_PASSWORD_UNCONFIGURED_MESSAGE };
  }

  const provided = fields[UPLOAD_PASSWORD_FIELD]?.trim();
  if (!provided) {
    return { status: 403, error: UPLOAD_PASSWORD_REQUIRED_MESSAGE };
  }

  const ok = await verifyPassword(settings.uploadPasswordHash, provided);
  if (!ok) return { status: 403, error: UPLOAD_PASSWORD_INVALID_MESSAGE };
  return null;
}

/** Enable upload gate for demo workspaces (password matches demo login). */
export async function syncDemoUploadPassword(db: DB, plainPassword: string): Promise<void> {
  const { hashPassword } = await import("../auth/session.js");
  const { orgSettings } = await import("../db/schema.js");
  const { eq } = await import("drizzle-orm");
  const settings = await getOrgSettings(db);
  await db
    .update(orgSettings)
    .set({
      uploadPasswordRequired: true,
      uploadPasswordHash: await hashPassword(plainPassword),
      updatedAt: new Date(),
    })
    .where(eq(orgSettings.id, settings.id));
}
