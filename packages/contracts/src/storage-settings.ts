import { z } from "zod";

/**
 * BYOS — Bring Your Own Storage (Core+).
 *
 * A firm can redirect ESTI's object storage from the ESTI-managed default to
 * their own:
 *   - **NAS / mounted folder**: an absolute path the backend AND worker can both
 *     write to (the operator mounts the share on both hosts — a shared volume).
 *   - **S3-compatible hosting engine**: their own MinIO / S3 / Wasabi / Backblaze
 *     / NAS-with-an-S3-gateway endpoint.
 *
 * Stored on the single-firm org settings (like aiSettings). The secret key is
 * persisted but never returned by read APIs.
 */

export const StorageMode = z.enum(["DEFAULT", "NAS", "S3"]);
export type StorageMode = z.infer<typeof StorageMode>;

export const STORAGE_MODE_LABEL: Record<StorageMode, string> = {
  DEFAULT: "ESTI-managed (default)",
  NAS: "NAS / mounted folder",
  S3: "S3-compatible (hosting engine)",
};

export const StorageSettings = z.object({
  mode: StorageMode.default("DEFAULT"),
  /** NAS mode: an absolute path the backend (and worker) can write to. */
  nasPath: z.string().max(500).optional(),
  /** S3 mode: endpoint URL, e.g. https://s3.example.com or http://nas.local:9000 */
  s3Endpoint: z.string().max(300).optional(),
  s3Region: z.string().max(60).optional(),
  s3Bucket: z.string().max(120).optional(),
  s3AccessKey: z.string().max(200).optional(),
  /** Secret — persisted but never returned by read APIs. */
  s3SecretKey: z.string().max(400).optional(),
});
export type StorageSettings = z.infer<typeof StorageSettings>;

export const DEFAULT_STORAGE_SETTINGS: StorageSettings = { mode: "DEFAULT" };

export function parseStorageSettings(raw: unknown): StorageSettings {
  const parsed = StorageSettings.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_STORAGE_SETTINGS;
}

/** The write form — secret optional (omit to keep the stored one). */
export const StorageSettingsInput = z.object({
  mode: StorageMode,
  nasPath: z.string().max(500).optional(),
  s3Endpoint: z.string().max(300).optional(),
  s3Region: z.string().max(60).optional(),
  s3Bucket: z.string().max(120).optional(),
  s3AccessKey: z.string().max(200).optional(),
  /** When omitted on update, the existing secret is preserved. */
  s3SecretKey: z.string().max(400).optional(),
});
export type StorageSettingsInput = z.infer<typeof StorageSettingsInput>;

/** Public projection — omits the secret, exposes whether one is configured. */
export interface StorageSettingsPublic {
  mode: StorageMode;
  nasPath: string | null;
  s3Endpoint: string | null;
  s3Region: string | null;
  s3Bucket: string | null;
  s3AccessKey: string | null;
  s3SecretConfigured: boolean;
}

export function toPublicStorageSettings(s: StorageSettings): StorageSettingsPublic {
  return {
    mode: s.mode,
    nasPath: s.nasPath ?? null,
    s3Endpoint: s.s3Endpoint ?? null,
    s3Region: s.s3Region ?? null,
    s3Bucket: s.s3Bucket ?? null,
    s3AccessKey: s.s3AccessKey ?? null,
    s3SecretConfigured: !!s.s3SecretKey,
  };
}

/** Validate a config is internally complete enough to use (UI + backend guard). */
export function storageConfigError(s: StorageSettingsInput): string | null {
  if (s.mode === "NAS") {
    if (!s.nasPath?.trim()) return "A folder path is required for NAS storage.";
  }
  if (s.mode === "S3") {
    if (!s.s3Endpoint?.trim()) return "An endpoint URL is required for S3 storage.";
    if (!s.s3Bucket?.trim()) return "A bucket name is required for S3 storage.";
  }
  return null;
}
