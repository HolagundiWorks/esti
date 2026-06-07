import { z } from "zod";

/**
 * Client communication timeline (roadmap esti_clientlog). Each entry is a dated
 * interaction on a project — enquiry, meeting, call, decision, approval — that
 * builds the running record of client communication and sign-offs.
 */
export const CLIENT_LOG_KINDS = {
  ENQUIRY: "Enquiry",
  MEETING: "Meeting",
  CALL: "Call",
  EMAIL: "Email",
  SITE_VISIT: "Site visit",
  DECISION: "Decision",
  APPROVAL: "Approval",
  NOTE: "Note",
} as const;

export type ClientLogKindCode = keyof typeof CLIENT_LOG_KINDS;
export const ClientLogKind = z.enum(
  Object.keys(CLIENT_LOG_KINDS) as [ClientLogKindCode, ...ClientLogKindCode[]],
);

export const ClientLogCreate = z.object({
  projectId: z.string().uuid(),
  kind: ClientLogKind,
  occurredAt: z.string(), // ISO date (yyyy-mm-dd)
  subject: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  followUpDate: z.string().nullable().optional(),
});
export type ClientLogCreate = z.infer<typeof ClientLogCreate>;
