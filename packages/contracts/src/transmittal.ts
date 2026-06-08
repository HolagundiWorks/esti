import { z } from "zod";

/**
 * Drawing transmittals — a formal record of drawings issued to a recipient,
 * with a cover-sheet PDF listing each drawing, revision and copies.
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
