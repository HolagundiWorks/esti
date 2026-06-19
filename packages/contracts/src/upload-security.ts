import { z } from "zod";

/** Multipart field name for REST binary upload routes. */
export const UPLOAD_PASSWORD_FIELD = "uploadPassword";

export const UPLOAD_PASSWORD_MIN_LENGTH = 4;
export const UPLOAD_PASSWORD_MAX_LENGTH = 128;

export const UploadSecuritySettingsInput = z.object({
  uploadPasswordRequired: z.boolean(),
  uploadPassword: z
    .string()
    .trim()
    .min(UPLOAD_PASSWORD_MIN_LENGTH)
    .max(UPLOAD_PASSWORD_MAX_LENGTH)
    .optional(),
});

export type UploadSecuritySettingsInput = z.infer<typeof UploadSecuritySettingsInput>;
