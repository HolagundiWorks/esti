import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  styled,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { MasterPlanCategory } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

/** Studio › Libraries › Master Plan Library — PDF / DWG / zoning / development files. */
export function MasterPlanLibrary() {
  const utils = trpc.useUtils();
  const listQ = trpc.masterPlans.list.useQuery();
  const remove = trpc.masterPlans.remove.useMutation({
    onSuccess: () => utils.masterPlans.list.invalidate(),
  });
  const { authorizedFetch } = useUploadAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(MasterPlanCategory.options[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/master-plan", (fd) => {
        fd.append("name", name || file.name);
        fd.append("category", category);
        fd.append("file", file);
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      }
      setName("");
      setFile(null);
      utils.masterPlans.list.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1.5, minWidth: 180 },
    {
      field: "category",
      headerName: "Category",
      width: 160,
      renderCell: (p) => (
        <Chip
          label={p.row.category}
          size="small"
          sx={{
            backgroundColor: "var(--cds-tag-background-gray)",
            color: "var(--cds-tag-color-gray)",
          }}
        />
      ),
    },
    {
      field: "fileName",
      headerName: "File",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) =>
        p.row.url ? (
          <Button variant="text" size="small" href={p.row.url} target="_blank" rel="noreferrer">
            {p.row.fileName}
          </Button>
        ) : (
          p.row.fileName
        ),
    },
    {
      field: "actions",
      headerName: "",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button
          variant="text"
          color="error"
          size="small"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: p.row.id })}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <RailLayout
      title="Master Plan Library"
      description="Reference master plans — PDF, DWG, zoning and development plans."
      aside={
        <Stack spacing={1.5}>
          <TextField
            id="mp-name"
            label="Name"
            placeholder="e.g. Whitefield zoning plan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            id="mp-cat"
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            {MasterPlanCategory.options.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" component="label" fullWidth>
            {file ? file.name : "Choose file"}
            <HiddenFileInput
              type="file"
              accept=".pdf,.dwg,.dxf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          <Button variant="contained" fullWidth disabled={!file || busy} onClick={upload}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
          )}
        </Stack>
      }
    >
      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No master plans", description: "Upload a PDF or DWG reference plan." }}
      >
        <DataGrid
          rows={listQ.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
    </RailLayout>
  );
}
