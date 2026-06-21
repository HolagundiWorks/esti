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
    label: "Outstanding",
    value: "₹1.2L",
    health: "alert",
    tagType: "red",
    tagText: "34d overdue",
    pulse: true,
  },
  {
    label: "Projects",
    value: "14",
    health: "ok",
    tagType: "blue",
    tagText: "All on track",
  },
  {
    label: "Pending approvals",
    value: "2",
    health: "watch",
    tagType: "magenta",
    tagText: "Awaiting client",
  },
];

export const LANDING_ACTIVITY_ROWS = [
  {
    id: "1",
    eventType: "drawing.issued",
    summary: "Drawing A-101 Rev C issued to client portal — Sharma Villa",
    createdAt: "2026-06-20T10:30:00+05:30",
  },
  {
    id: "2",
    eventType: "decision.updated",
    summary: "Scope change approved by client: façade option B — Verde Block",
    createdAt: "2026-06-19T16:15:00+05:30",
  },
  {
    id: "3",
    eventType: "invoice.created",
    summary: "Tax invoice raised — ₹4.85L incl. GST 18% — Sharma Villa",
    createdAt: "2026-06-18T11:00:00+05:30",
  },
] as const;

export const LANDING_PENDING_APPROVALS = [
  { id: "1", ref: "Sharma Villa — façade option B", detail: "Client approval pending", days: 3 },
  { id: "2", ref: "Verde Block — landscape package", detail: "Consultant sign-off", days: 6 },
] as const;

export const LANDING_OVERDUE_INVOICES = [
  { id: "1", ref: "INV-2026-011", amount: "₹1.2L", daysOverdue: 34 },
] as const;
