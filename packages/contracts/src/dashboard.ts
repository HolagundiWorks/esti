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
  bylaw: "PROJECT",
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
