/**
 * Office overview KPI strip — uses the same dashboard components as `/` (Dashboard.tsx).
 */
import { useEffect, useRef, useState } from "react";
import { Column, Grid } from "@carbon/react";
import { KpiChip, ZoneHead } from "../dashboard/dashboardUi.js";
import { LANDING_DASHBOARD_KPIS } from "./landing-dashboard-demo.js";

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
          <ZoneHead
            title="Office overview"
            sub="Billing, delivery, and team at a glance."
          />
        </Column>

        {LANDING_DASHBOARD_KPIS.map((kpi, index) => (
          <Column key={kpi.label} lg={4} md={4} sm={2}>
            <div
              className={[
                "esti-lp-kpi-slot",
                `esti-lp-kpi-slot--${index}`,
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
      </Grid>
    </div>
  );
}
