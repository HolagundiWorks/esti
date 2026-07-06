import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TAG,
  ProjectStatus,
  ProjectType,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const PAGE_SIZES = [10, 25, 50];

type ProjectStatusCode = (typeof ProjectStatus.options)[number];

export function Projects() {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const list = trpc.projectOffice.list.useQuery({
    limit: 200,
    offset: 0,
    status: statusFilter ? (statusFilter as ProjectStatusCode) : undefined,
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<string>(ProjectType.options[0]);
  const [clientId, setClientId] = useState("");
  const clientsQ = trpc.clients.list.useQuery({ limit: 200, offset: 0 });

  const [search, setSearch] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: PAGE_SIZES[0] ?? 10,
  });

  const create = trpc.projectOffice.create.useMutation({
    onSuccess: () => {
      utils.projectOffice.list.invalidate();
      setOpen(false);
      setTitle("");
    },
  });

  const allRows = list.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = q
    ? allRows.filter((p) =>
        [
          p.ref,
          p.title,
          p.projectType,
          PROJECT_STATUS_LABEL[p.status as ProjectStatusCode] ?? p.status,
          formatINR(p.contractValuePaise, { paise: false }),
        ].some((v) => String(v ?? "").toLowerCase().includes(q)),
      )
    : allRows;

  const columns: GridColDef[] = [
    {
      field: "ref",
      headerName: "Ref",
      flex: 0.7,
      minWidth: 110,
      renderCell: (p) => (
        <Link to={`/projects/${p.row.id}`} onClick={(e) => e.stopPropagation()}>
          {p.row.ref}
        </Link>
      ),
    },
    { field: "title", headerName: "Title", flex: 1.6, minWidth: 200 },
    { field: "projectType", headerName: "Type", flex: 1, minWidth: 130 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 130,
      valueGetter: (_v, row) =>
        PROJECT_STATUS_LABEL[row.status as ProjectStatusCode] ?? row.status,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as ProjectStatusCode}
          map={PROJECT_STATUS_TAG}
          label={
            PROJECT_STATUS_LABEL[p.row.status as ProjectStatusCode] ?? p.row.status
          }
        />
      ),
    },
    {
      field: "value",
      headerName: "Contract value",
      flex: 0.9,
      minWidth: 150,
      valueGetter: (_v, row) => formatINR(row.contractValuePaise, { paise: false }),
    },
  ];

  return (
    <>
      <RailLayout
        title="Projects"
        description="Architecture project offices — phases, fees, drawings and delivery."
        aside={
          <Stack spacing={1.5}>
            <TextField
              id="project-search"
              size="small"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => {
                setPaginationModel((m) => ({ ...m, page: 0 }));
                setSearch(e.target.value);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              fullWidth
            />
            <TextField
              id="project-status-filter"
              select
              size="small"
              label="Project status"
              value={statusFilter}
              onChange={(e) => {
                setPaginationModel((m) => ({ ...m, page: 0 }));
                setStatusFilter(e.target.value);
              }}
              fullWidth
            >
              <MenuItem value="">All statuses</MenuItem>
              {ProjectStatus.options.map((status) => (
                <MenuItem key={status} value={status}>
                  {PROJECT_STATUS_LABEL[status]}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
              New project
            </Button>
          </Stack>
        }
      >
        <DataState
          loading={list.isLoading}
          isEmpty={allRows.length === 0}
          columnCount={5}
          empty={{
            title: "No projects yet",
            description:
              "Create your first project office to start tracking phases, fees and invoices.",
            action: (
              <Button variant="contained" size="small" onClick={() => setOpen(true)}>
                New project
              </Button>
            ),
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            autoHeight
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={PAGE_SIZES}
            onRowClick={(params) => navigate(`/projects/${params.id}`)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </DataState>
      </RailLayout>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="title"
              label="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              id="projectType"
              select
              label="Project type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
            >
              {ProjectType.options.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="client"
              select
              label="Client (optional)"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <MenuItem value="">— none —</MenuItem>
              {(clientsQ.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {create.error && (
              <Alert severity="error">
                <strong>Could not create</strong> — {create.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!title || create.isPending}
            onClick={() =>
              create.mutate({
                title,
                projectType: projectType as (typeof ProjectType.options)[number],
                clientId: clientId || undefined,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
