import { z } from "zod";
import type { Capability } from "./permissions.js";

/** Catalogue of dashboard widgets the user can place on their grid. */
// Widths align to a clean 2-column grid (12-col layout → w:6 = half width).
export const DASHBOARD_WIDGETS = [
  { id: "clock", title: "Clock & leave", w: 6, h: 4, capability: null },
  { id: "projects", title: "Projects", w: 6, h: 2, capability: null },
  { id: "invoices", title: "Invoices (₹)", w: 6, h: 2, capability: null },
  { id: "permits", title: "Permits", w: 6, h: 2, capability: null },
  { id: "fees", title: "Fee proposals", w: 6, h: 2, capability: "fees:manage" },
  { id: "tasks", title: "Open tasks", w: 6, h: 2, capability: null },
  { id: "alerts", title: "Alerts", w: 6, h: 2, capability: null },
  { id: "hr", title: "HR summary", w: 6, h: 2, capability: "hr:manage" },
  { id: "projectsByPhase", title: "Projects by phase", w: 6, h: 4, capability: null },
  { id: "projectsByType", title: "Projects by type", w: 6, h: 4, capability: null },
  { id: "tasksToday", title: "Tasks due today", w: 6, h: 2, capability: null },
  { id: "workload", title: "Workload by assignee", w: 6, h: 4, capability: null },
  { id: "onLeave", title: "On leave today", w: 6, h: 2, capability: "hr:manage" },
  { id: "receivables", title: "Receivables aging", w: 6, h: 4, capability: "fees:manage" },
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
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(200),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
});
export type DashboardLayoutItem = z.infer<typeof DashboardLayoutItem>;

export const DashboardLayout = z.array(DashboardLayoutItem).max(50);
export type DashboardLayout = z.infer<typeof DashboardLayout>;

/** Tidy 2-column starting layout for a fresh user (12-col grid, w:6 = half). */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = [
  { i: "clock", x: 0, y: 0, w: 6, h: 4 },
  { i: "projectsByPhase", x: 6, y: 0, w: 6, h: 4 },
  { i: "projects", x: 0, y: 4, w: 6, h: 2 },
  { i: "invoices", x: 6, y: 4, w: 6, h: 2 },
  { i: "tasksToday", x: 0, y: 6, w: 6, h: 2 },
  { i: "permits", x: 6, y: 6, w: 6, h: 2 },
  { i: "projectsByType", x: 0, y: 8, w: 6, h: 4 },
  { i: "workload", x: 6, y: 8, w: 6, h: 4 },
];
