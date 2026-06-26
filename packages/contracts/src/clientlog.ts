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

/**
 * Project OS — Client Discussion Layer (Slice F). Structured outcome captured
 * after a feasibility discussion. Drives the draft-project funnel.
 */
export const ClientDiscussionOutcome = z.enum([
  "INTERESTED",
  "BUDGET_REVISION_NEEDED",
  "SCOPE_CHANGE_NEEDED",
  "FOLLOW_UP_LATER",
  "REJECTED",
]);
export type ClientDiscussionOutcome = z.infer<typeof ClientDiscussionOutcome>;

export const CLIENT_DISCUSSION_OUTCOME_LABEL: Record<ClientDiscussionOutcome, string> = {
  INTERESTED: "Interested",
  BUDGET_REVISION_NEEDED: "Budget revision needed",
  SCOPE_CHANGE_NEEDED: "Scope change needed",
  FOLLOW_UP_LATER: "Follow up later",
  REJECTED: "Rejected",
};

export const CLIENT_DISCUSSION_OUTCOME_TAG: Record<
  ClientDiscussionOutcome,
  "green" | "purple" | "teal" | "blue" | "red"
> = {
  INTERESTED: "green",
  BUDGET_REVISION_NEEDED: "purple",
  SCOPE_CHANGE_NEEDED: "teal",
  FOLLOW_UP_LATER: "blue",
  REJECTED: "red",
};

export const ClientLogCreate = z.object({
  projectId: z.string().uuid(),
  kind: ClientLogKind,
  occurredAt: z.string(), // ISO date (yyyy-mm-dd)
  subject: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  followUpDate: z.string().nullable().optional(),
  // Project OS — Client Discussion Layer (Slice F).
  outcome: ClientDiscussionOutcome.optional(),
  budgetObjections: z.string().max(2000).optional(),
  architectComments: z.string().max(2000).optional(),
});
export type ClientLogCreate = z.infer<typeof ClientLogCreate>;
