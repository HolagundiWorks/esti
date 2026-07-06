import { Chip, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

// Preserve exact Carbon tag colours by rendering an MUI Chip over the
// `--cds-tag-*` token vars (still defined by the Carbon token layer).
const tagSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color}, var(--cds-layer-01))`,
  color: `var(--cds-tag-color-${color}, var(--cds-text-primary))`,
});

const forecastColumns = (resourceLabel: string): GridColDef[] => [
  { field: "itemName", headerName: resourceLabel, flex: 1.5, minWidth: 180 },
  {
    field: "unit",
    headerName: "Unit",
    flex: 0.6,
    minWidth: 90,
    valueGetter: (_v, row) => row.unit ?? "—",
  },
  {
    field: "forecastQty",
    headerName: "Forecast qty",
    flex: 0.8,
    minWidth: 120,
    renderCell: (p) => p.row.forecastQty.toFixed(3),
  },
];

export function ProjectCostIntelligence({ projectId }: { projectId: string }) {
  const dashQ = trpc.cms.intelligence.costDashboard.useQuery({ projectId });
  const matQ = trpc.cms.intelligence.materialForecast.useQuery({ projectId });

  const d = dashQ.data;
  const materials = (matQ.data ?? []).filter((l) => l.type === "MATERIAL");
  const labour = (matQ.data ?? []).filter((l) => l.type === "LABOUR");

  return (
    <Stack spacing={4}>
      <Typography variant="h6" component="h3">Cost Intelligence</Typography>

      {/* CMS-8: Cost Dashboard */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" component="h4">Cost Dashboard</Typography>
        <DataState
          loading={dashQ.isLoading}
          isEmpty={!dashQ.isLoading && !d}
          empty={{ title: "No cost data", description: "Add elements in the Estimate tab to see cost intelligence." }}
          columnCount={4}
        >
          {d && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Paper sx={{ p: 2, height: 1 }}>
                  <p className="esti-label--secondary">Estimated Total</p>
                  <p>{formatINR(d.estimatedTotalPaise)}</p>
                  <p className="esti-label--helper">{d.elementCount} elements</p>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Paper sx={{ p: 2, height: 1 }}>
                  <p className="esti-label--secondary">Executed (Est. Value)</p>
                  <p>{formatINR(d.executedEstimatedPaise)}</p>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, d.percentExecuted))}
                  />
                  <p className="esti-label--helper">{d.percentExecuted}% complete</p>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Paper sx={{ p: 2, height: 1 }}>
                  <p className="esti-label--secondary">Certified Total</p>
                  <p>{formatINR(d.certifiedTotalPaise)}</p>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, d.percentCertified))}
                  />
                  <p className="esti-label--helper">{d.percentCertified}% of estimated</p>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Paper sx={{ p: 2, height: 1 }}>
                  <p className="esti-label--secondary">Balance to Certify</p>
                  <p>
                    {formatINR(Math.max(0, d.estimatedTotalPaise - d.certifiedTotalPaise))}
                  </p>
                  <div className="esti-label--helper">
                    {d.certifiedTotalPaise >= d.estimatedTotalPaise ? (
                      <Chip label="Fully certified" size="small" sx={tagSx("green")} />
                    ) : (
                      <Chip label="Pending" size="small" sx={tagSx("cool-gray")} />
                    )}
                  </div>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DataState>
      </Stack>

      {/* CMS-7: Material Intelligence */}
      {materials.length > 0 && (
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h4">Material Forecast</Typography>
          <Typography variant="caption" color="text.secondary">
            Materials required (from element qty × spec recipe)
          </Typography>
          <DataGrid
            rows={materials}
            columns={forecastColumns("Material")}
            getRowId={(row) => row.itemId ?? row.itemName}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Stack>
      )}

      {labour.length > 0 && (
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h4">Labour Forecast</Typography>
          <Typography variant="caption" color="text.secondary">
            Labour required (from element qty × spec recipe)
          </Typography>
          <DataGrid
            rows={labour}
            columns={forecastColumns("Labour resource")}
            getRowId={(row) => row.itemId ?? row.itemName}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Stack>
      )}

      {!dashQ.isLoading && !matQ.isLoading && matQ.data?.length === 0 && !dashQ.data && (
        <p className="esti-label--secondary">
          Link elements to KB specifications with recipes to generate material and labour forecasts.
        </p>
      )}
    </Stack>
  );
}
