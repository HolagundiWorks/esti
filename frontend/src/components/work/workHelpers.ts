import { TaskStatus, type TaskLoadBand, taskLoadBand } from "@esti/contracts";

export const PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red",
  HIGH: "magenta",
  MEDIUM: "blue",
  LOW: "gray",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WORK_TAB_SLUGS = [
  "tasks",
  "board",
  "workload",
  "activity",
  "client-requests",
  "consultant-requests",
  "attendance",
] as const;
export type WorkTabSlug = (typeof WORK_TAB_SLUGS)[number];

/** Tabs always visible on Work (solo or studio). */
export const WORK_TABS_BASE = [
  "tasks",
  "board",
  "activity",
  "client-requests",
  "consultant-requests",
] as const satisfies readonly WorkTabSlug[];

/** HR-gated Work tabs inserted after Board. */
export const WORK_TABS_HR = ["workload", "attendance"] as const satisfies readonly WorkTabSlug[];

export function workTabsForNav(hrEnabled: boolean): WorkTabSlug[] {
  if (!hrEnabled) return [...WORK_TABS_BASE];
  return [
    "tasks",
    "board",
    "workload",
    "activity",
    "client-requests",
    "consultant-requests",
    "attendance",
  ];
}

export const BOARD_COLUMNS: {
  status: (typeof TaskStatus.options)[number];
  tag: "gray" | "blue" | "red" | "green";
}[] = [
  { status: "TODO", tag: "gray" },
  { status: "IN_PROGRESS", tag: "blue" },
  { status: "BLOCKED", tag: "red" },
  { status: "DONE", tag: "green" },
];

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function officeBand(total: number, headcount: number): TaskLoadBand {
  const per = headcount > 0 ? total / headcount : total;
  return taskLoadBand(Math.round(per));
}

export function formatWhen(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function heatStyle(n: number): { backgroundColor: string; color: string } {
  if (n === 0) return { backgroundColor: "transparent", color: "var(--cds-text-primary)" };
  if (n <= 2) return { backgroundColor: "var(--cds-tag-background-teal)", color: "var(--cds-tag-color-teal)" };
  if (n <= 5) return { backgroundColor: "var(--cds-tag-background-blue)", color: "var(--cds-tag-color-blue)" };
  if (n <= 8) return { backgroundColor: "var(--cds-tag-background-purple)", color: "var(--cds-tag-color-purple)" };
  return { backgroundColor: "var(--cds-tag-background-red)", color: "var(--cds-tag-color-red)" };
}
