import type { CardHealth, TagType } from "../dashboard/dashboardUi.js";

export const LANDING_DASHBOARD_KPIS: {
  label: string;
  value: string;
  health: CardHealth;
  tagType: TagType;
  tagText: string;
  pulse?: boolean;
}[] = [
  {
    label: "Ready to bill",
    value: "₹8.4L",
    health: "ok",
    tagType: "green",
    tagText: "4 phases",
  },
  {
    label: "Outstanding collections",
    value: "₹3.2L",
    health: "neutral",
    tagType: "gray",
    tagText: "Nothing overdue",
  },
  {
    label: "Active projects",
    value: "14",
    health: "ok",
    tagType: "blue",
    tagText: "All on track",
  },
  {
    label: "Attendance today",
    value: "11/12",
    health: "watch",
    tagType: "magenta",
    tagText: "1 absent · 2 WFH",
    pulse: true,
  },
];

export const LANDING_ACTIVITY_ROWS = [
  {
    id: "1",
    eventType: "drawing.issued",
    summary: "Drawing A-101 Rev C issued to client portal — Sharma Villa",
    createdAt: "2026-06-12T10:30:00+05:30",
  },
  {
    id: "2",
    eventType: "decision.updated",
    summary: "CRIF-0042 decision recorded: Accept scope change on façade option B",
    createdAt: "2026-06-10T16:15:00+05:30",
  },
  {
    id: "3",
    eventType: "invoice.created",
    summary: "Tax invoice INV-2026-014 raised — ₹4.85 L incl. GST 18%",
    createdAt: "2026-06-08T11:00:00+05:30",
  },
  {
    id: "4",
    eventType: "bylaw.saved",
    summary: "Development envelope saved to Project Info — Metro Towers",
    createdAt: "2026-06-05T09:45:00+05:30",
  },
] as const;

export const LANDING_PENDING_APPROVALS = [
  { id: "1", ref: "Sharma Villa — façade option B", detail: "Client approval pending", days: 3 },
  { id: "2", ref: "Verde Block — landscape package", detail: "Consultant sign-off", days: 6 },
] as const;

export const LANDING_OVERDUE_INVOICES = [
  { id: "1", ref: "INV-2026-011", amount: "₹1.2L", daysOverdue: 34 },
] as const;
