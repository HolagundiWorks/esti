import { z } from "zod";

// Studio › Libraries › Standards Library.
export const StandardDiscipline = z.enum(["INTERIORS", "PLUMBING", "ELECTRICAL", "LIGHTING"]);
export type StandardDiscipline = z.infer<typeof StandardDiscipline>;

export const StandardFileKind = z.enum(["PDF", "DRAWING", "DETAIL"]);
export type StandardFileKind = z.infer<typeof StandardFileKind>;

export const StandardCreate = z.object({
  discipline: StandardDiscipline,
  title: z.string().min(1).max(300),
  notes: z.string().max(8000).optional(),
  tableJson: z.array(z.record(z.string(), z.string())).optional(),
});
export type StandardCreate = z.infer<typeof StandardCreate>;

export const StandardUpdate = StandardCreate.partial().extend({ id: z.string().uuid() });
export type StandardUpdate = z.infer<typeof StandardUpdate>;

/** Allowed standard-file types + size cap. */
export const STANDARD_FILE_EXTENSIONS = [".pdf", ".dwg", ".dxf", ".png", ".jpg", ".jpeg"] as const;
export const STANDARD_FILE_MAX_BYTES = 30 * 1024 * 1024;
