import { Column, InlineLoading, Stack, Tile } from "@carbon/react";
import { DonutChart, SimpleBarChart } from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import { formatINRShort } from "@esti/contracts";
import {
  CHART_HEIGHT,
  edge,
  FilingTile,
  nextMonthlyDue,
  nextTdsReturnDue,
  ZoneHead,
  ZoneTile,
} from "./dashboardUi.js";

type Props = {
  navigate: (to: string) => void;
  chartTheme: string;
  homeLoading: boolean;
  canFees: boolean;
  showFinancial: boolean;
  revenueData: { group: string; value: number }[];
  agingData: { group: string; value: number }[];
  agingEmpty: boolean;
};

export function DashboardFinancialSection({
  navigate,
  chartTheme,
  homeLoading,
  canFees,
  showFinancial,
  revenueData,
  agingData,
  agingEmpty,
}: Props) {
  return (
    <>
      <Column lg={16} md={8} sm={4}>
        <ZoneHead
          title="Financial"
          sub="Revenue, receivables, and GST/TDS filing."
        />
      </Column>

      {canFees && showFinancial && (
        <>
          <Column lg={16} md={8} sm={4}>
            <ZoneTile navigate={navigate} title="Financial health" to="/invoices" />
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill" style={edge("neutral")}>
              <Stack gap={5}>
                <h4>Revenue breakdown</h4>
                {homeLoading ? (
                  <InlineLoading description="Loading…" />
                ) : revenueData.length === 0 ? (
                  <p>No financial data yet.</p>
                ) : (
                  <div className="esti-chart-md">
                    <DonutChart
                      data={revenueData}
                      options={{
                        data: { groupMapsTo: "group" },
                        donut: {
                          alignment: "center",
                          center: {
                            label: "Revenue",
                            numberFormatter: (v: number) => formatINRShort(v),
                          },
                        },
                        height: CHART_HEIGHT,
                        theme: chartTheme,
                        toolbar: { enabled: false },
                        legend: { enabled: true, position: "bottom" as const },
                        pie: {
                          labels: {
                            enabled: true,
                            formatter: (d: { value: number }) => formatINRShort(d.value),
                          },
                        },
                        tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
                      }}
                    />
                  </div>
                )}
              </Stack>
            </Tile>
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill" style={edge(agingEmpty ? "neutral" : "watch")}>
              <Stack gap={5}>
                <h4>Receivables aging</h4>
                {homeLoading ? (
                  <InlineLoading description="Loading…" />
                ) : agingEmpty ? (
                  <p>No outstanding receivables.</p>
                ) : (
                  <div className="esti-chart-md">
                    <SimpleBarChart
                      data={agingData}
                      options={{
                        axes: {
                          left: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
                          bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
                        },
                        height: CHART_HEIGHT,
                        theme: chartTheme,
                        toolbar: { enabled: false },
                        legend: { enabled: false },
                        tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
                      }}
                    />
                  </div>
                )}
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {showFinancial && (
        <>
          <FilingTile
            navigate={navigate}
            title="GST filing"
            rows={[
              { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
              { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
            ]}
          />
          <FilingTile
            navigate={navigate}
            title="TDS filing"
            rows={[
              { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
              { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
            ]}
          />
        </>
      )}
    </>
  );
}
