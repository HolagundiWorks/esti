import { z } from "zod";

/** Default page size for office-wide list queries. */
export const LIST_LIMIT_DEFAULT = 100;

/** Hard server cap — never return more rows than this in one query. */
export const LIST_LIMIT_MAX = 500;

export function clampListLimit(requested?: number | null): number {
  if (requested == null || requested <= 0) return LIST_LIMIT_DEFAULT;
  return Math.min(Math.floor(requested), LIST_LIMIT_MAX);
}

/** Project-scoped lists — optional limit clamped server-side. */
export const ProjectListParams = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().min(1).max(LIST_LIMIT_MAX).optional(),
});
export type ProjectListParams = z.infer<typeof ProjectListParams>;

/** Office-wide lists with optional limit. */
export const OfficeListParams = z.object({
  limit: z.number().int().min(1).max(LIST_LIMIT_MAX).optional(),
});
export type OfficeListParams = z.infer<typeof OfficeListParams>;