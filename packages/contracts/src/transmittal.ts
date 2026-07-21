import { z } from "zod";

/**
 * Drawing / deliverable transmittals — a formal record of documents issued to a
 * recipient, with a cover-sheet PDF and a one-way receiver acknowledgment
 * (SOP §3 Transmittal Register).
 */
export const TRANSMITTAL_PURPOSES = {
  FOR_APPROVAL: "For approval",
  FOR_CONSTRUCTION: "For construction",
  FOR_INFORMATION: "For information",
  FOR_TENDER: "For tender",
  AS_BUILT: "As built",
} as const;
export type TransmittalPurposeCode = keyof typeof TRANSMITTAL_PURPOSES;
export const TransmittalPurpose = z.enum(
  Object.keys(TRANSMITTAL_PURPOSES) as [TransmittalPurposeCode, ...TransmittalPurposeCode[]],
);

export const TRANSMITTAL_CHANNELS = {
  EMAIL: "Email",
  PRINT: "Printed set",
  PORTAL: "Client portal",
  COURIER: "Courier",
  HAND: "By hand",
} as const;
export type TransmittalChannelCode = keyof typeof TRANSMITTAL_CHANNELS;
export const TransmittalChannel = z.enum(
  Object.keys(TRANSMITTAL_CHANNELS) as [TransmittalChannelCode, ...TransmittalChannelCode[]],
);

export const TransmittalItemInput = z.object({
  drawingId: z.string().uuid().nullable().optional(),
  drawingRef: z.string().min(1).max(60),
  title: z.string().min(1).max(200),
  rev: z.string().max(20).optional(),
  copies: z.number().int().positive().default(1),
});
export type TransmittalItemInput = z.infer<typeof TransmittalItemInput>;

export const TransmittalCreate = z.object({
  projectId: z.string().uuid(),
  recipient: z.string().min(1).max(200),
  purpose: TransmittalPurpose,
  channel: TransmittalChannel,
  dateIssued: z.string().nullable().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(TransmittalItemInput).min(1),
});
export type TransmittalCreate = z.infer<typeof TransmittalCreate>;

/** Staff or portal stamp that the receiver acknowledged receipt. One-way. */
export const TransmittalAcknowledge = z.object({
  id: z.string().uuid(),
  acknowledgedBy: z.string().trim().min(1).max(200),
  note: z.string().trim().max(1000).optional(),
});
export type TransmittalAcknowledge = z.infer<typeof TransmittalAcknowledge>;

export function isTransmittalAcknowledged(row: {
  acknowledgedAt: string | Date | null | undefined;
}): boolean {
  return row.acknowledgedAt != null;
}

/**
 * Pure gate for stamping acknowledgment — issued (has date) and not yet acked.
 */
export function canAcknowledgeTransmittal(row: {
  dateIssued: string | Date | null | undefined;
  acknowledgedAt: string | Date | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (!row.dateIssued)
    return { ok: false, reason: "Only issued transmittals can be acknowledged." };
  if (isTransmittalAcknowledged(row))
    return { ok: false, reason: "This transmittal is already acknowledged." };
  return { ok: true };
}
