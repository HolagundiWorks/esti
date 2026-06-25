import { z } from "zod";
import type { Capability } from "./permissions.js";

/** Catalogue of dashboard widgets the user can place on their grid. */
// Widths follow Carbon's 2x Grid (16 columns): 4 = quarter, 8 = half, 16 = full.
export const DASHBOARD_WIDGETS = [
  { id: "clock", title: "Clock & leave", w: 4, h: 4, capability: null },
  { id: "projects", title: "Projects", w: 4, h: 2, capability: null },
  { id: "invoices", title: "Invoices (₹)", w: 4, h: 2, capability: null },
  { id: "permits", title: "Permits", w: 4, h: 2, capability: null },
  { id: "fees", title: "Fee proposals", w: 4, h: 2, capability: "fees:manage" },
  { id: "tasks", title: "Open tasks", w: 4, h: 2, capability: null },
  { id: "alerts", title: "Alerts", w: 4, h: 2, capability: null },
  { id: "hr", title: "HR summary", w: 4, h: 2, capability: "hr:manage" },
  { id: "projectsByPhase", title: "Projects by phase", w: 8, h: 4, capability: null },
  { id: "projectsByType", title: "Projects by type", w: 8, h: 4, capability: null },
  { id: "tasksToday", title: "Tasks due today", w: 4, h: 2, capability: null },
  { id: "workload", title: "Workload by assignee", w: 8, h: 4, capability: null },
  { id: "onLeave", title: "On leave today", w: 4, h: 2, capability: "hr:manage" },
  { id: "receivables", title: "Receivables aging", w: 8, h: 4, capability: "fees:manage" },
  { id: "gstDue", title: "GST filing due", w: 4, h: 3, capability: null },
  { id: "tdsDue", title: "TDS filing due", w: 4, h: 3, capability: null },
] as const satisfies readonly {
  id: string;
  title: string;
  w: number;
  h: number;
  capability: Capability | null;
}[];

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]["id"];

export const DASHBOARD_WIDGET_IDS = DASHBOARD_WIDGETS.map((w) => w.id) as DashboardWidgetId[];

/** One placed widget (react-grid-layout item geometry + widget id as `i`). */
export const DashboardLayoutItem = z.object({
  i: z.string().min(1).max(40),
  x: z.number().int().min(0).max(15),
  y: z.number().int().min(0).max(200),
  w: z.number().int().min(1).max(16),
  h: z.number().int().min(1).max(12),
});
export type DashboardLayoutItem = z.infer<typeof DashboardLayoutItem>;

export const DashboardLayout = z.array(DashboardLayoutItem).max(50);
export type DashboardLayout = z.infer<typeof DashboardLayout>;

/** Starting layout for a fresh user on Carbon's 16-column 2x Grid. */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = [
  { i: "clock", x: 0, y: 0, w: 4, h: 4 },
  { i: "gstDue", x: 4, y: 0, w: 4, h: 3 },
  { i: "tdsDue", x: 8, y: 0, w: 4, h: 3 },
  { i: "projects", x: 12, y: 0, w: 4, h: 2 },
  { i: "invoices", x: 12, y: 2, w: 4, h: 2 },
  { i: "projectsByPhase", x: 0, y: 4, w: 8, h: 4 },
  { i: "projectsByType", x: 8, y: 4, w: 8, h: 4 },
  { i: "tasksToday", x: 0, y: 8, w: 4, h: 2 },
  { i: "permits", x: 4, y: 8, w: 4, h: 2 },
  { i: "alerts", x: 8, y: 8, w: 4, h: 2 },
];

// --- Activity domain classification -------------------------------------------

/** High-level domain buckets for activity feed categorisation. */
export type ActivityDomain = "PROJECT" | "FINANCIAL" | "CLIENT" | "TEAM" | "SYSTEM";

const DOMAIN_PREFIXES: Record<string, ActivityDomain> = {
  project: "PROJECT",
  phase: "PROJECT",
  drawing: "PROJECT",
  transmittal: "PROJECT",
  specification: "PROJECT",
  moodboard: "PROJECT",
  approval: "PROJECT",
  criticalnote: "PROJECT",
  decision: "PROJECT",
  comment: "PROJECT",
  inspection: "PROJECT",
  permit: "PROJECT",
  task: "TEAM",
  leave: "TEAM",
  payslip: "TEAM",
  hr: "TEAM",
  assignment: "TEAM",
  invoice: "FINANCIAL",
  feeproposal: "FINANCIAL",
  reconcile: "FINANCIAL",
  po: "FINANCIAL",
  receipt: "FINANCIAL",
  client: "CLIENT",
  clientlog: "CLIENT",
  consultant: "CLIENT",
};

/** Derive the Activity domain category from an event-type string (e.g. "task.done" → "TEAM"). */
export function activityDomain(eventType: string): ActivityDomain {
  const prefix = (eventType.split(".")[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return DOMAIN_PREFIXES[prefix] ?? "SYSTEM";
}

export const ACTIVITY_DOMAIN_TAG: Record<ActivityDomain, "blue" | "green" | "teal" | "purple" | "gray"> = {
  PROJECT: "blue",
  FINANCIAL: "green",
  CLIENT: "teal",
  TEAM: "purple",
  SYSTEM: "gray",
};

// --- Cognition engine contracts ----------------------------------------------

export const CognitionEventDomain = z.enum([
  "CLIENT",
  "FINANCE",
  "PROJECT",
  "TEAM",
  "APPROVAL",
  "MEETING",
  "SYSTEM",
]);
export type CognitionEventDomain = z.infer<typeof CognitionEventDomain>;

export const CognitionEventSeverity = z.enum(["stable", "watch", "friction", "critical"]);
export type CognitionEventSeverity = z.infer<typeof CognitionEventSeverity>;

export const CognitionPriorityItem = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  title: z.string(),
  recommendedAction: z.string(),
  howTo: z.array(z.string()),
  expectedBenefit: z.string(),
  priorityScore: z.number().int().min(0).max(100),
  status: z.string(),
  sourceKey: z.string(),
  domain: CognitionEventDomain,
  eventType: z.string(),
  subjectLabel: z.string(),
  severity: CognitionEventSeverity,
  evidence: z.unknown(),
});
export type CognitionPriorityItem = z.infer<typeof CognitionPriorityItem>;

export const CognitionBehaviorProfile = z.object({
  subjectType: z.string(),
  subjectId: z.string(),
  label: z.string(),
  signalType: z.string(),
  sampleCount: z.number().int().min(0),
  confidencePct: z.number().int().min(0).max(100),
  metrics: z.unknown(),
  lastObservedAt: z.union([z.string(), z.date()]),
});
export type CognitionBehaviorProfile = z.infer<typeof CognitionBehaviorProfile>;

export const CognitionReasoningFrame = z.object({
  rule: z.literal("DETERMINISTIC_REASONING_LLM_EXPLAINS_ONLY"),
  generatedAt: z.string(),
  nextBestAction: z.object({
    title: z.string(),
    recommendedAction: z.string(),
    priorityScore: z.number().int().min(0).max(100),
    reason: z.string(),
    expectedBenefit: z.string(),
    howTo: z.array(z.string()),
    evidence: z.unknown(),
  }),
  learnedPatterns: z.array(z.object({
    subjectType: z.string(),
    label: z.string(),
    signalType: z.string(),
    confidencePct: z.number().int().min(0).max(100),
    pattern: z.unknown(),
    metrics: z.unknown(),
  })),
  safeToIgnore: z.array(z.object({
    title: z.string(),
    reason: z.string(),
    priorityScore: z.number().int().min(0).max(100),
  })),
});
export type CognitionReasoningFrame = z.infer<typeof CognitionReasoningFrame>;
