import ArrowForward from "@mui/icons-material/ArrowForward";
import { Box, Card, CardActionArea, Grid, Stack } from "@mui/material";
import { StatusDot } from "../StatusTag.js";
import type { ReactNode } from "react";

export const CHART_HEIGHT = "240px";

export type TagType =
  | "red" | "magenta" | "green" | "blue" | "teal" | "gray"
  | "purple" | "cyan" | "cool-gray" | "warm-gray" | "high-contrast" | "outline";

export const HEALTH_LABEL: Record<string, string> = {
  RED: "At risk",
  YELLOW: "Watch",
  GREEN: "Healthy",
};
export const HEALTH_TAG: Record<string, "red" | "magenta" | "green"> = {
  RED: "red",
  YELLOW: "magenta",
  GREEN: "green",
};
export const CAPACITY_LABEL: Record<string, string> = {
  OVERLOADED: "Overloaded",
  BUSY: "Busy",
  HEALTHY: "Available",
};
export const CAPACITY_TAG: Record<string, "red" | "magenta" | "green"> = {
  OVERLOADED: "red",
  BUSY: "magenta",
  HEALTHY: "green",
};
export const RISK_TAG: Record<"LOW" | "MEDIUM" | "HIGH", "red" | "magenta" | "green"> = {
  HIGH: "red",
  MEDIUM: "magenta",
  LOW: "green",
};

/** Status indicator — a coloured dot + text (delegates to the shared StatusDot). */
export function TagChip({ type, label }: { type: TagType; label: ReactNode }) {
  return <StatusDot color={type} label={label} />;
}

export function formatEventType(et: string): string {
  return et
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86400000,
  );
}
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function nextMonthlyDue(day: number): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let y = now.getFullYear(),
    m = now.getMonth();
  if (now.getDate() > day) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return isoDate(y, m, day);
}
export function nextTdsReturnDue(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlines = [
    { m: 6, d: 31 },
    { m: 9, d: 31 },
    { m: 0, d: 31 },
    { m: 4, d: 31 },
  ];
  const y = now.getFullYear();
  const cands: Date[] = [];
  for (const off of [0, 1])
    for (const dl of deadlines) cands.push(new Date(y + off, dl.m, dl.d));
  cands.sort((a, b) => a.getTime() - b.getTime());
  const next = cands.find((c) => c.getTime() >= now.getTime()) ?? cands[0]!;
  return isoDate(next.getFullYear(), next.getMonth(), next.getDate());
}
function dueTagType(days: number): "red" | "magenta" | "blue" {
  return days <= 3 ? "red" : days <= 7 ? "magenta" : "blue";
}
function dueLabel(days: number) {
  return days === 0 ? "Due today" : days < 0 ? `${-days}d overdue` : `${days}d left`;
}

export type CardHealth = "alert" | "watch" | "ok" | "neutral";

const EDGE_COLOR: Record<CardHealth, string> = {
  alert: "var(--cds-support-error)",
  watch: "var(--cds-support-warning)",
  ok: "var(--cds-support-success)",
  neutral: "var(--cds-border-subtle-01)",
};

export function edge(health: CardHealth) {
  return { borderLeft: `3px solid ${EDGE_COLOR[health]}` };
}

export function ZoneTile({
  navigate,
  title,
  sub,
  to,
  statusTag,
}: {
  navigate: (to: string) => void;
  title: string;
  sub?: string;
  to?: string;
  statusTag?: { text: string; type: TagType };
}) {
  const inner = (
    <div className="esti-row">
      <div className="esti-grow">
        <Stack spacing={1}>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </Stack>
      </div>
      {statusTag && <TagChip type={statusTag.type} label={statusTag.text} />}
      {to && <ArrowForward sx={{ fontSize: 16 }} />}
    </div>
  );
  return to ? (
    <Card className="esti-fill">
      <CardActionArea sx={{ height: 1, p: 2 }} onClick={() => navigate(to)}>{inner}</CardActionArea>
    </Card>
  ) : (
    <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>{inner}</Box>
  );
}

export function ZoneHead({
  title,
  sub,
  statusTag,
}: {
  title: string;
  sub?: string;
  statusTag?: { text: string; type: TagType };
}) {
  return (
    <div className="esti-zone-head">
      <div className="esti-grow">
        <h2>{title}</h2>
        {sub && <p style={{ color: "var(--cds-text-secondary)" }}>{sub}</p>}
      </div>
      {statusTag && <TagChip type={statusTag.type} label={statusTag.text} />}
    </div>
  );
}

export function KpiChip({
  label,
  value,
  health,
  tagType,
  tagText,
  onClick,
  loading,
}: {
  label: string;
  value: string | number;
  health: CardHealth;
  tagType: TagType;
  tagText?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const body = (
    <Stack spacing={1}>
      <div className="esti-row-between">
        <p>{label}</p>
        {onClick && <ArrowForward sx={{ fontSize: 16 }} />}
      </div>
      <h3>{loading ? "…" : value}</h3>
      {tagText && <TagChip type={tagType} label={tagText} />}
    </Stack>
  );
  return onClick ? (
    <Card className="esti-fill" style={edge(health)}>
      <CardActionArea sx={{ height: 1, p: 2 }} onClick={onClick}>{body}</CardActionArea>
    </Card>
  ) : (
    <Box className="esti-fill" style={edge(health)} sx={{ p: 2 }}>
      {body}
    </Box>
  );
}

export function FilingTile({
  navigate,
  title,
  rows,
}: {
  navigate: (to: string) => void;
  title: string;
  rows: { label: string; iso: string }[];
}) {
  const worst = Math.min(...rows.map((r) => daysUntil(r.iso)));
  const health: CardHealth = worst <= 3 ? "alert" : worst <= 7 ? "watch" : "neutral";
  return (
    <Grid size={{ xs: 12, md: 6, lg: 3 }}>
      <Card className="esti-fill" style={edge(health)}>
        <CardActionArea sx={{ height: 1, p: 2 }} onClick={() => navigate("/filing")}>
          <Stack spacing={2}>
            <div className="esti-row">
              <h4 className="esti-grow">{title}</h4>
              <ArrowForward sx={{ fontSize: 16 }} />
            </div>
            <Stack spacing={1.5}>
              {rows.map((r) => {
                const days = daysUntil(r.iso);
                return (
                  <Stack key={r.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <div className="esti-grow">
                      <p>{r.label}</p>
                    </div>
                    <TagChip type={dueTagType(days)} label={dueLabel(days)} />
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </CardActionArea>
      </Card>
    </Grid>
  );
}
