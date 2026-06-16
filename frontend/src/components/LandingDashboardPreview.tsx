/**
 * Animated office-dashboard preview for the marketing landing hero.
 * Mirrors the real Dashboard KPI strip (Grid, ZoneHead, KpiChip layout).
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@carbon/icons-react";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";

type CardHealth = "alert" | "watch" | "ok" | "neutral";
type TagType = "red" | "magenta" | "green" | "blue" | "gray";

const EDGE_COLOR: Record<CardHealth, string> = {
  alert: "var(--cds-support-error)",
  watch: "var(--cds-support-warning)",
  ok: "var(--cds-support-success)",
  neutral: "var(--cds-border-subtle-01)",
};

function edge(health: CardHealth) {
  return { borderLeft: `3px solid ${EDGE_COLOR[health]}` };
}

const DEMO_KPIS: {
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

function PreviewKpiChip({
  label,
  value,
  health,
  tagType,
  tagText,
  index,
  pulse,
}: (typeof DEMO_KPIS)[number] & { index: number }) {
  return (
    <Tile
      className={[
        "esti-fill",
        "esti-lp-kpi",
        `esti-lp-kpi--${index}`,
        pulse && "esti-lp-kpi--pulse",
      ]
        .filter(Boolean)
        .join(" ")}
      style={edge(health)}
    >
      <Stack gap={3}>
        <div className="esti-row-between esti-lp-kpi-label">
          <p>{label}</p>
          <ArrowRight size={16} aria-hidden />
        </div>
        <h3 className="esti-lp-kpi-value">{value}</h3>
        <Tag type={tagType} size="sm" className="esti-lp-kpi-tag">
          {tagText}
        </Tag>
      </Stack>
    </Tile>
  );
}

export function LandingDashboardPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const activate = () => setLive(true);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          activate();
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);

    // Hero is above the fold — start animation once the reveal finishes.
    const t = window.setTimeout(activate, 400);

    return () => {
      obs.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`esti-lp-dash-frame${live ? " esti-lp-dash-frame--live" : ""}`}
      aria-label="Office overview KPI preview"
    >
      <Grid fullWidth condensed className="esti-dash">
        <Column lg={16} md={8} sm={4}>
          <div className="esti-zone-head esti-lp-zone-head">
            <div className="esti-grow">
              <h2>Office overview</h2>
              <p>Billing, delivery, and team at a glance.</p>
            </div>
          </div>
        </Column>

        {DEMO_KPIS.map((kpi, index) => (
          <Column key={kpi.label} lg={4} md={4} sm={2}>
            <PreviewKpiChip {...kpi} index={index} />
          </Column>
        ))}
      </Grid>
    </div>
  );
}
