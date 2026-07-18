import { useEffect, useState } from "react";
import { Box, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { trpc } from "../lib/trpc";

type Overview = Awaited<ReturnType<typeof trpc.admin.dashboard.overview.query>>;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "green",
  TRIAL: "teal",
  SUSPENDED: "cool-gray",
  REVOKED: "red",
  EXPIRED: "gray",
};
const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d: Date | string) => new Date(d).toLocaleString();

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: "warn" | "default" }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" component="p" color={tone === "warn" && Number(value) > 0 ? "warning.main" : undefined}>
        {value}
      </Typography>
    </Paper>
  );
}

/** License-manager landing page — KPI overview for the platform-admin console. */
export default function DashboardTab({ onGoTo }: { onGoTo: (section: "licenses" | "requests" | "orgs") => void }) {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    void trpc.admin.dashboard.overview.query().then(setData);
  }, []);

  if (!data) return null;

  const expiringColumns: GridColDef<Overview["expiringSoon"][number]>[] = [
    { field: "orgName", headerName: "Organization", flex: 1.2, minWidth: 160 },
    { field: "productCode", headerName: "Product", flex: 0.8, minWidth: 100 },
    { field: "key", headerName: "Key", flex: 1.2, minWidth: 180 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 100,
      renderCell: (p) => (
        <Chip size="small" label={STATUS_LABEL[p.row.status] ?? p.row.status} sx={chipSx(STATUS_COLOR[p.row.status] ?? "gray")} />
      ),
    },
    { field: "expiresAt", headerName: "Expires", flex: 0.8, minWidth: 110, renderCell: (p) => fmtDate(p.row.expiresAt) },
  ];

  const eventColumns: GridColDef<Overview["recentEvents"][number]>[] = [
    { field: "at", headerName: "When", flex: 1, minWidth: 160, renderCell: (p) => fmtDateTime(p.row.at) },
    { field: "type", headerName: "Event", flex: 0.8, minWidth: 120 },
    { field: "orgName", headerName: "Organization", flex: 1, minWidth: 140 },
    { field: "licenseKey", headerName: "License", flex: 1, minWidth: 160 },
    { field: "actor", headerName: "Actor", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
  ];

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Kpi label="Total licenses" value={data.totalLicenses} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Kpi label="Organizations" value={data.totalOrgs} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Kpi label="Active devices" value={data.activeDevices} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Kpi label="New this month" value={data.newThisMonth} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box onClick={() => onGoTo("requests")} sx={{ cursor: "pointer" }}>
            <Kpi label="Pending requests" value={data.pendingRequests} tone="warn" />
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box onClick={() => onGoTo("orgs")} sx={{ cursor: "pointer" }}>
            <Kpi label="Unlicensed orgs" value={data.unlicensedOrgs} tone="warn" />
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box onClick={() => onGoTo("licenses")} sx={{ cursor: "pointer" }}>
            <Kpi label="Expiring in 30 days" value={data.expiringSoon.length} tone="warn" />
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Kpi
            label="Suspended / revoked"
            value={(data.byStatus.SUSPENDED ?? 0) + (data.byStatus.REVOKED ?? 0)}
            tone="warn"
          />
        </Grid>
      </Grid>

      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Licenses by status
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {Object.entries(data.byStatus).map(([status, n]) => (
            <Chip
              key={status}
              label={`${STATUS_LABEL[status] ?? status}: ${n}`}
              sx={chipSx(STATUS_COLOR[status] ?? "gray")}
            />
          ))}
        </Stack>
      </Box>

      {data.byProduct.length > 0 && (
        <Box>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Licenses by product
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {data.byProduct.map((p) => (
              <Chip key={p.code} variant="outlined" label={`${p.name}: ${p.n}`} />
            ))}
          </Stack>
        </Box>
      )}

      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Expiring in the next 30 days
        </Typography>
        <DataGrid
          rows={data.expiringSoon}
          columns={expiringColumns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          localeText={{ noRowsLabel: "Nothing expiring in the next 30 days." }}
        />
      </Box>

      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Recent license activity
        </Typography>
        <DataGrid
          rows={data.recentEvents}
          columns={eventColumns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          localeText={{ noRowsLabel: "No license activity yet." }}
        />
      </Box>
    </Stack>
  );
}
