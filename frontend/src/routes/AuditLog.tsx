import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc.js";

const PAGE_SIZES = [10, 25, 50, 100];

type Filters = { search: string; entity: string; action: string };

function jsonDetail(value: unknown) {
  return value === null || value === undefined
    ? "No snapshot recorded"
    : JSON.stringify(value, null, 2);
}

const fmtTime = (v: string | number | Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));

export function AuditLog({ embedded = false }: { embedded?: boolean }) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [filters, setFilters] = useState<Filters>({ search: "", entity: "", action: "" });
  const [applied, setApplied] = useState<Filters>(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = trpc.audit.list.useQuery({
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    search: applied.search || undefined,
    entity: applied.entity || undefined,
    action: applied.action || undefined,
  });
  const rows = list.data?.rows ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  function applyFilters() {
    setPaginationModel((m) => ({ ...m, page: 0 }));
    setApplied(filters);
  }
  function clearFilters() {
    const empty = { search: "", entity: "", action: "" };
    setFilters(empty);
    setApplied(empty);
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }

  useScreenActions(
    embedded
      ? []
      : [
          {
            id: "clear-filters",
            zone: "left",
            tone: "danger",
            label: "Clear",
            icon: <ClearIcon />,
            onClick: clearFilters,
          },
          {
            id: "apply-filters",
            zone: "right",
            tone: "primary",
            label: "Apply filters",
            icon: <FilterListIcon />,
            onClick: applyFilters,
          },
        ],
    [embedded, filters],
  );

  const columns: GridColDef[] = [
    { field: "createdAt", headerName: "Time", flex: 1.2, minWidth: 160, renderCell: (p) => fmtTime(p.row.createdAt) },
    { field: "entity", headerName: "Entity", flex: 1, minWidth: 120 },
    { field: "action", headerName: "Action", flex: 1, minWidth: 120 },
    {
      field: "actor",
      headerName: "Actor",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.actorName ?? row.actorEmail ?? "System",
    },
    { field: "entityId", headerName: "Record ID", flex: 1, minWidth: 120, valueGetter: (v) => v ?? "—" },
    {
      field: "details",
      headerName: "Details",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => (
        <RowActionsMenu actions={[{ label: "View", onClick: () => setSelectedId(p.row.id) }]} />
      ),
    },
  ];

  const filterFields = (
    <Stack spacing={1.5} direction={embedded ? "row" : "column"} sx={{ flexWrap: "wrap" }}>
      <TextField
        id="audit-search"
        label="Search actor, entity, or action"
        value={filters.search}
        onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        fullWidth={!embedded}
        size="small"
        sx={embedded ? { minWidth: 200, flex: 1 } : undefined}
      />
      <TextField
        id="audit-entity"
        select
        label="Entity"
        value={filters.entity}
        onChange={(e) => setFilters((c) => ({ ...c, entity: e.target.value }))}
        fullWidth={!embedded}
        size="small"
        sx={embedded ? { minWidth: 140 } : undefined}
      >
        <MenuItem value="">All entities</MenuItem>
        {(list.data?.filters.entities ?? []).map((entity) => (
          <MenuItem key={entity} value={entity}>
            {entity}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        id="audit-action"
        select
        label="Action"
        value={filters.action}
        onChange={(e) => setFilters((c) => ({ ...c, action: e.target.value }))}
        fullWidth={!embedded}
        size="small"
        sx={embedded ? { minWidth: 140 } : undefined}
      >
        <MenuItem value="">All actions</MenuItem>
        {(list.data?.filters.actions ?? []).map((action) => (
          <MenuItem key={action} value={action}>
            {action}
          </MenuItem>
        ))}
      </TextField>
      {embedded && (
        <>
          <Button variant="outlined" size="small" startIcon={<ClearIcon />} onClick={clearFilters}>
            Clear
          </Button>
          <Button variant="contained" size="small" startIcon={<FilterListIcon />} onClick={applyFilters}>
            Apply filters
          </Button>
        </>
      )}
    </Stack>
  );

  const grid = (
    <>
      {list.error && <Alert severity="error">{list.error.message}</Alert>}
      <DataGrid
        rows={rows}
        columns={columns}
        loading={list.isLoading}
        rowCount={list.data?.total ?? 0}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={PAGE_SIZES}
        disableRowSelectionOnClick
        autoHeight
      />
    </>
  );

  return (
    <>
      {embedded ? (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" component="h2">
              Audit log
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Append-only record of security-sensitive and operational changes.
            </Typography>
            {filterFields}
            {grid}
          </Stack>
        </Box>
      ) : (
        <RailLayout
          title="Audit log"
          description="Append-only record of security-sensitive and operational changes."
          aside={filterFields}
        >
          {grid}
        </RailLayout>
      )}

      <Dialog open={selected !== null} onClose={() => setSelectedId(null)} fullWidth maxWidth="md">
        <DialogTitle>{selected ? `${selected.entity} · ${selected.action}` : "Audit details"}</DialogTitle>
        {selected && (
          <DialogContent>
            <Stack spacing={2}>
              <Typography variant="body2">
                Record: {selected.entityId ?? "Not associated with a domain record"}
              </Typography>
              <Typography variant="body2">
                Actor: {selected.actorName ?? selected.actorEmail ?? selected.actorId ?? "System"}
              </Typography>
              {(["before", "after"] as const).map((k) => (
                <Stack spacing={1} key={k}>
                  <Typography variant="subtitle2" sx={{ textTransform: "capitalize" }}>{k}</Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.5,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      overflowX: "auto",
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    {jsonDetail(selected[k])}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
