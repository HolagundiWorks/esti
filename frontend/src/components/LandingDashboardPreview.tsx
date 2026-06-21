import { useEffect, useRef, useState } from "react";
import { Column, Grid, Stack, Theme, Tile } from "@carbon/react";
import { WarningFilled } from "@carbon/icons-react";
import { KpiChip, ZoneHead } from "./dashboard/dashboardUi.js";
import {
  LANDING_DASHBOARD_KPIS,
  LANDING_ACTIVITY_ROWS,
  LANDING_PENDING_APPROVALS,
  LANDING_OVERDUE_INVOICES,
} from "./landing/landing-dashboard-demo.js";

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function LandingDashboardPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const activate = () => setLive(true);
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { activate(); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    const t = window.setTimeout(activate, 300);
    return () => { obs.disconnect(); window.clearTimeout(t); };
  }, []);

  return (
    /* Theme white = light product card on dark page (matches Linear pattern).
       esti-lp-carbon = card frame; esti-lp-dash-frame = animated inner layer. */
    <Theme theme="white">
    <div className="esti-lp-carbon" aria-label="ESTI office overview preview">
      <div
        ref={rootRef}
        className={`esti-lp-dash-frame${live ? " esti-lp-dash-frame--live" : ""}`}
      >
        <Grid fullWidth condensed className="esti-dash">
          {/* Zone header */}
          <Column lg={16} md={8} sm={4}>
            <ZoneHead
              title="Office overview"
              sub="Sharma Villa · Verde Block · Metro Towers · +11 more"
            />
          </Column>

          {/* KPI chips — staggered animation via esti-lp-kpi-slot--N */}
          {LANDING_DASHBOARD_KPIS.map((kpi, i) => (
            <Column key={kpi.label} lg={4} md={4} sm={4}>
              <div
                className={[
                  "esti-lp-kpi-slot",
                  `esti-lp-kpi-slot--${i}`,
                  kpi.pulse && "esti-lp-kpi-slot--pulse",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <KpiChip
                  label={kpi.label}
                  value={kpi.value}
                  health={kpi.health}
                  tagType={kpi.tagType}
                  tagText={kpi.tagText}
                />
              </div>
            </Column>
          ))}

          {/* Lower panels — action center + activity */}
          <Column lg={8} md={4} sm={4}>
            <div className="esti-lp-dash-lower">
              <Stack gap={3}>
                <p className="esti-landing-eyebrow">Action center</p>
                {LANDING_PENDING_APPROVALS.map((item) => (
                  <Tile key={item.id}>
                    <Stack orientation="horizontal" gap={3}>
                      <WarningFilled
                        size={16}
                        aria-hidden
                        style={{ color: "var(--cds-support-warning)", flexShrink: 0, marginTop: "2px" }}
                      />
                      <Stack gap={1}>
                        <p style={{ fontSize: "var(--cds-body-short-01-font-size)" }}>{item.ref}</p>
                        <p className="esti-label esti-label--helper">{item.detail} · {item.days}d</p>
                      </Stack>
                    </Stack>
                  </Tile>
                ))}
                {LANDING_OVERDUE_INVOICES.map((inv) => (
                  <Tile key={inv.id}>
                    <Stack orientation="horizontal" gap={3}>
                      <WarningFilled
                        size={16}
                        aria-hidden
                        style={{ color: "var(--cds-support-error)", flexShrink: 0, marginTop: "2px" }}
                      />
                      <Stack gap={1}>
                        <p style={{ fontSize: "var(--cds-body-short-01-font-size)" }}>{inv.ref} — {inv.amount}</p>
                        <p className="esti-label esti-label--helper">{inv.daysOverdue}d overdue</p>
                      </Stack>
                    </Stack>
                  </Tile>
                ))}
              </Stack>
            </div>
          </Column>

          <Column lg={8} md={4} sm={4}>
            <div className="esti-lp-dash-lower">
              <Stack gap={3}>
                <p className="esti-landing-eyebrow">Recent activity</p>
                {LANDING_ACTIVITY_ROWS.map((row) => (
                  <Tile key={row.id}>
                    <Stack gap={1}>
                      <p style={{ fontSize: "var(--cds-body-short-01-font-size)" }}>{row.summary}</p>
                      <p className="esti-label esti-label--helper">{relativeTime(row.createdAt)}</p>
                    </Stack>
                  </Tile>
                ))}
              </Stack>
            </div>
          </Column>
        </Grid>
      </div>
    </div>
    </Theme>
  );
}
