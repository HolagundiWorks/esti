import { z } from "zod";
import type { Capability } from "./permissions.js";

/** Catalogue of dashboard widgets the user can place on their grid. */
export const DASHBOARD_WIDGETS = [
  { id: "clock", title: "Clock & leave", w: 3, h: 4, capability: null },
  { id: "projects", title: "Projects", w: 3, h: 2, capability: null },
  { id: "invoices", title: "Invoices (₹)", w: 3, h: 2, capability: null },
  { id: "permits", title: "Permits", w: 3, h: 2, capability: null },
  { id: "fees", title: "Fee proposals", w: 3, h: 2, capability: "fees:manage" },
  { id: "tasks", title: "Open tasks", w: 3, h: 2, capability: null },
  { id: "alerts", title: "Alerts", w: 3, h: 2, capability: null },
  { id: "hr", title: "HR summary", w: 3, h: 2, capability: "hr:manage" },
  { id: "projectsByPhase", title: "Projects by phase", w: 4, h: 4, capability: null },
  { id: "projectsByType", title: "Projects by type", w: 4, h: 4, capability: null },
  { id: "tasksToday", title: "Tasks due today", w: 3, h: 2, capability: null },
  { id: "workload", title: "Workload by assignee", w: 4, h: 4, capability: null },
  { id: "onLeave", title: "On leave today", w: 3, h: 2, capability: "hr:manage" },
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

/** Sensible starting layout for a fresh user (12-col grid). */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = [
  { i: "clock", x: 0, y: 0, w: 3, h: 4 },
  { i: "projects", x: 3, y: 0, w: 3, h: 2 },
  { i: "invoices", x: 6, y: 0, w: 3, h: 2 },
  { i: "permits", x: 9, y: 0, w: 3, h: 2 },
  { i: "tasks", x: 3, y: 2, w: 3, h: 2 },
  { i: "alerts", x: 6, y: 2, w: 3, h: 2 },
];
