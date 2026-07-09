import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TAG, type ProjectStatus } from "@esti/contracts";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { DataState } from "../DataState.js";
import { RailLayout } from "../RailLayout.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

/** Pick a live project to open the estimation workspace. */
export function EstimationProjectPicker() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const list = trpc.projectOffice.list.useQuery({
    limit: 200,
    offset: 0,
    status: statusFilter ? (statusFilter as ProjectStatus) : undefined,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter((p) => {
      if (p.status === "ARCHIVED") return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.ref ?? "").toLowerCase().includes(q) ||
        (p.projectType ?? "").toLowerCase().includes(q)
      );
    });
  }, [list.data, search]);

  const cols: GridColDef[] = [
    {
      field: "ref",
      headerName: "Ref",
      width: 100,
      renderCell: ({ row }) => (
        <Button
          variant="text"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/estimation/${row.id}`);
          }}
        >
          {row.ref ?? "—"}
        </Button>
      ),
    },
    { field: "title", headerName: "Project", flex: 1, minWidth: 200 },
    { field: "projectType", headerName: "Type", width: 140 },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: ({ value }) => (
        <StatusTag
          value={value as ProjectStatus}
          map={PROJECT_STATUS_TAG}
          label={PROJECT_STATUS_LABEL[value as ProjectStatus] ?? String(value)}
        />
      ),
    },
  ];

  return (
    <RailLayout
      title="Estimation"
      description="Select a live project. Model the structure, enter measurements, and generate BOQ and BBS."
      aside={
        <Stack spacing={2}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, opacity: 0.5 }} />,
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All active</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="ON_HOLD">On hold</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
          </TextField>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Alert severity="info">
          Estimation uses the Item Library, specifications, and rate book. Select a project
          below to model structure, enter measurements, and generate BOQ/BBS.
        </Alert>
        {list.error && <Alert severity="error">{list.error.message}</Alert>}
        <DataState
          loading={list.isLoading}
          isEmpty={!list.isLoading && rows.length === 0}
          empty={{
            title: "No live projects",
            description: "Create a project from Projects, then return here to estimate.",
          }}
        >
          <Box sx={{ height: 480 }}>
            <DataGrid
              rows={rows}
              columns={cols}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              onRowClick={(p) => navigate(`/estimation/${p.id}`)}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </DataState>
        {!list.isLoading && rows.length === 0 && !list.error && (
          <Typography variant="body2" color="text.secondary">
            No live projects match. Create one from Projects first.
          </Typography>
        )}
      </Stack>
    </RailLayout>
  );
}
