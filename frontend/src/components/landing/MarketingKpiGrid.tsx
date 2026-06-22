import { Column, Grid, Stack, Tile } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

const KPIS = [
  { value: "₹8.4L", label: "Fees in pipeline", note: "Across 14 active projects" },
  { value: "14", label: "Active projects", note: "Across all phases" },
  { value: "₹1.2L", label: "Outstanding", note: "2 invoices overdue" },
  { value: "2", label: "Pending approvals", note: "Drawing revisions awaiting" },
] as const;

export function MarketingKpiGrid() {
  return (
    <LandingBand id="kpi" ariaLabelledby="kpi-label" className="esti-landing-kpi-band">
      <LandingEditorial>
        <Grid fullWidth className="esti-landing-kpi-grid">
          {KPIS.map((kpi) => (
            <Column key={kpi.label} lg={4} md={4} sm={4}>
              <Tile className="esti-landing-kpi-tile">
                <Stack gap={3}>
                  <p className="esti-label--helper">{kpi.label}</p>
                  <p className="esti-landing-kpi-number">
                    {kpi.value}
                  </p>
                  <p className="esti-label--secondary">{kpi.note}</p>
                </Stack>
              </Tile>
            </Column>
          ))}
        </Grid>
      </LandingEditorial>
    </LandingBand>
  );
}
