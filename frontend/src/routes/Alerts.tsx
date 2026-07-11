import { Box, Divider, Link, Skeleton, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Link as RouterLink } from "react-router-dom";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const KIND_LABEL: Record<string, string> = {
  approval: "Client decision",
  followup: "Follow-up",
  permit: "Permit",
  submission: "Portal request",
  task: "Overdue task",
  leave: "Leave impact",
  tender: "Tender closing",
  construction: "Site coordination",
};

type AlertRow = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  projectId: string | null;
  projectRef: string | null;
  date: string | null;
};

// Preserve exact Carbon tag colours by mapping severity to the `--cds-tag-*`
// token vars (still defined by the Carbon token layer).
const SEVERITY_COLOR: Record<string, string> = {
  high: "red",
  medium: "magenta",
};

function NoRowsOverlay() {
  return (
    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center" }}>
      <Typography variant="body2" color="text.secondary">Nothing in this view.</Typography>
    </Stack>
  );
}

function AlertTable({ title, alerts }: { title: string; alerts: AlertRow[] }) {
  const columns: GridColDef<AlertRow>[] = [
    {
      field: "severity",
      headerName: "Severity",
      width: 120,
      renderCell: (p) => {
        const color = SEVERITY_COLOR[p.row.severity] ?? "gray";
        return <StatusDot color={color} label={p.row.severity} />;
      },
    },
    {
      field: "kind",
      headerName: "Type",
      width: 160,
      valueGetter: (_v, row) => KIND_LABEL[row.kind] ?? row.kind,
    },
    {
      field: "title",
      headerName: "Alert",
      flex: 2,
      minWidth: 240,
      renderCell: (p) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{p.row.title}</Typography>
          <Typography variant="caption" color="text.secondary">{p.row.detail}</Typography>
        </Box>
      ),
    },
    {
      field: "projectRef",
      headerName: "Project",
      width: 140,
      renderCell: (p) =>
        p.row.projectId && p.row.projectRef ? (
          <Link component={RouterLink} to={`/projects/${p.row.projectId}`}>{p.row.projectRef}</Link>
        ) : (
          "—"
        ),
    },
    {
      field: "date",
      headerName: "Date",
      width: 140,
      valueGetter: (_v, row) => row.date ?? "—",
    },
  ];

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title}</Typography>
      <DataGrid
        rows={alerts}
        columns={columns}
        getRowHeight={() => "auto"}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
        slots={{ noRowsOverlay: NoRowsOverlay }}
      />
    </Stack>
  );
}

export function Alerts() {
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });
  const digestQ = trpc.notifications.digest.useQuery(undefined, {
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });
  const alerts = alertsQ.data ?? [];
  const digest = digestQ.data;

  if (alertsQ.isLoading && alertsQ.data == null) {
    return (
      <RailLayout
        title="Alerts"
        description="Immediate items needing action, plus a daily digest of lower-priority follow-ups."
      >
        <PageBreadcrumb items={[{ label: "Alerts" }]} />
        <Stack spacing={1.5} aria-busy="true" aria-label="Loading alerts">
          <Skeleton variant="text" width={180} height={28} />
          <Skeleton variant="rectangular" height={220} />
        </Stack>
      </RailLayout>
    );
  }

  return (
    <RailLayout
      title="Alerts"
      description="Immediate items needing action, plus a daily digest of lower-priority follow-ups."
    >
      <PageBreadcrumb items={[{ label: "Alerts" }]} />
      <AlertTable title={`Immediate action (${alerts.length})`} alerts={alerts} />

      {digest && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6" component="h3">Daily digest · {digest.date}</Typography>
              <Typography variant="body2">
                Medium-priority follow-ups and upcoming leave — configured in Company → Alert
                escalation.
              </Typography>
              <AlertTable
                title={`Digest items (${digest.count})`}
                alerts={digest.items}
              />
            </Stack>
          </Box>
        </>
      )}
    </RailLayout>
  );
}
