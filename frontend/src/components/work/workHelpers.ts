import { TaskStatus, type TaskLoadBand, taskLoadBand } from "@esti/contracts";

export const PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red",
  HIGH: "magenta",
  MEDIUM: "blue",
  LOW: "gray",
};

/** ESTI Pulse consequence band tag colour (docs/esti/ESTI-PULSE.md §8). */
export const PRIORITY_BAND_TAG: Record<string, "red" | "magenta" | "purple" | "blue" | "gray"> = {
  CRITICAL: "red",
  ACTION_TODAY: "magenta",
  WATCH: "purple",
  NORMAL: "blue",
  BACKLOG: "gray",
};

/** ESTI Pulse confidence score tag colour — a task with missing data must not look healthy. */
export function confidenceTag(score: number): "green" | "purple" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "purple";
  return "red";
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WORK_TAB_SLUGS = [
  "tasks",
  "board",
  "calendar",
  "workload",
  "activity",
  "requests",
  // Legacy slugs — old links/bookmarks alias to "requests" (2026-07 Miller merge).
  "client-requests",
  "consultant-requests",
  "attendance",
] as const;
export type WorkTabSlug = (typeof WORK_TAB_SLUGS)[number];

/** Legacy ?tab= slugs → their canonical tab. */
export function canonicalWorkTab(slug: WorkTabSlug): WorkTabSlug {
  return slug === "client-requests" || slug === "consultant-requests" ? "requests" : slug;
}

/** Tabs always visible on Work (solo or studio). */
export const WORK_TABS_BASE = [
  "tasks",
  "board",
  "calendar",
  "activity",
  "requests",
] as const satisfies readonly WorkTabSlug[];

/** HR-gated Work tabs inserted after Board. */
export const WORK_TABS_HR = ["workload", "attendance"] as const satisfies readonly WorkTabSlug[];

export function workTabsForNav(hrEnabled: boolean): WorkTabSlug[] {
  if (!hrEnabled) return [...WORK_TABS_BASE];
  return [
    "tasks",
    "board",
    "calendar",
    "workload",
    "activity",
    "requests",
    "attendance",
  ];
}

export type WorkCategorySlug =
  | "all"
  | "execution"
  | "drawings"
  | "documentation"
  | "billing"
  | "approvals"
  | "revisions";

export const WORK_CATEGORY_SLUGS: readonly WorkCategorySlug[] = [
  "all", "execution", "drawings", "documentation", "billing", "approvals", "revisions",
];

export const WORK_CATEGORY_LABELS: Record<WorkCategorySlug, string> = {
  all: "All",
  execution: "Execution",
  drawings: "Drawings",
  documentation: "Documentation",
  billing: "Billing",
  approvals: "Approvals",
  revisions: "Revisions",
};

export const WORK_CATEGORY_FILTER: Record<
  WorkCategorySlug,
  { workType?: string; classification?: string; status?: string }
> = {
  all: {},
  execution: { workType: "CONSTRUCTION_SUPPORT" },
  drawings: { workType: "TECHNICAL_PRODUCTION" },
  documentation: { workType: "DESIGN_DEVELOPMENT" },
  billing: { classification: "BILLABLE" },
  approvals: { status: "BLOCKED" },
  revisions: { workType: "DESIGN_COMMUNICATION" },
};

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
