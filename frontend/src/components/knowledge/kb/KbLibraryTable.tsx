import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, type ChangeEvent } from "react";
import { formatINR } from "@esti/contracts";
import { ConfirmModal } from "../../ConfirmModal.js";
import { DataState } from "../../DataState.js";
import { csvToRows, downloadCsv, rowsToCsv } from "./csv.js";

const HiddenFileInput = styled("input")({ display: "none" });

export type KbFieldType = "text" | "textarea" | "number" | "money" | "boolean";

export interface KbField {
  key: string;
  label: string;
  type: KbFieldType;
  required?: boolean;
  placeholder?: string;
  helper?: string;
}

export type KbRow = { id: string } & Record<string, unknown>;

interface Props {
  title: string;
  description?: string;
  newLabel: string;
  fields: KbField[];
  rows: KbRow[];
  loading?: boolean;
  saving?: boolean;
  onSubmit: (values: Record<string, unknown>, id: string | null) => void;
  onRemove: (id: string) => void;
  /** When provided, an "Import CSV" button bulk-creates the parsed rows. */
  onImport?: (rows: Record<string, unknown>[]) => void;
}

function display(row: KbRow, f: KbField): string {
  const v = row[f.key];
  if (f.type === "boolean") return v ? "Yes" : "—";
  if (v === null || v === undefined || v === "") return "—";
  if (f.type === "money") return formatINR(Number(v));
  return String(v);
}

function toForm(row: KbRow | null, fields: KbField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = row?.[f.key];
    if (f.type === "boolean") out[f.key] = v ? "true" : "";
    else if (v === null || v === undefined) out[f.key] = "";
    else out[f.key] = f.type === "money" ? String(Number(v) / 100) : String(v);
  }
  return out;
}

/** Generic schema-mapper table: an editable data table driven by a field list.
 *  Money fields are stored/returned in paise; the form shows/accepts rupees. */
export function KbLibraryTable({
  title,
  description,
  newLabel,
  fields,
  rows,
  loading,
  saving,
  onSubmit,
  onRemove,
  onImport,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const csvName = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
  function exportCsv() {
    downloadCsv(csvName, rowsToCsv(fields, rows));
  }
  function handleImportFile(evt: ChangeEvent<HTMLInputElement>) {
    const file = evt.target.files?.[0];
    if (!file || !onImport) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = csvToRows(fields, String(reader.result ?? ""));
      if (parsed.length > 0) onImport(parsed);
    };
    reader.readAsText(file);
    evt.target.value = "";
  }

  function openNew() {
    setEditId(null);
    setForm(toForm(null, fields));
    setOpen(true);
  }
  function openEdit(row: KbRow) {
    setEditId(row.id);
    setForm(toForm(row, fields));
    setOpen(true);
  }

  const requiredOk = fields.every(
    (f) => !f.required || (form[f.key] ?? "").trim() !== "",
  );

  function submit() {
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "boolean") {
        values[f.key] = (form[f.key] ?? "") === "true";
        continue;
      }
      const raw = (form[f.key] ?? "").trim();
      if (f.type === "money") values[f.key] = raw === "" ? 0 : Math.round(Number(raw) * 100);
      else if (f.type === "number") {
        if (raw !== "") values[f.key] = Number(raw);
      } else if (raw !== "") values[f.key] = raw;
    }
    onSubmit(values, editId);
    setOpen(false);
  }

  const columns: GridColDef[] = [
    ...fields.map(
      (f): GridColDef => ({
        field: f.key,
        headerName: f.label,
        flex: f.type === "textarea" ? 2 : 1,
        valueGetter: (_value, row) => display(row as KbRow, f),
      }),
    ),
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            aria-label="Edit"
            title="Edit"
            onClick={() => openEdit(params.row as KbRow)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            aria-label="Remove"
            title="Remove"
            onClick={() => setConfirmId((params.row as KbRow).id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
        <Stack spacing={1} className="esti-grow">
          <Typography variant="h5" component="h2">{title}</Typography>
          {description ? <Typography variant="body2">{description}</Typography> : null}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="text"
            startIcon={<DownloadIcon />}
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
          {onImport ? (
            <Button variant="text" component="label">
              Import CSV
              <HiddenFileInput type="file" accept=".csv" onChange={handleImportFile} />
            </Button>
          ) : null}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            {newLabel}
          </Button>
        </Stack>
      </Stack>

      <DataState
        loading={!!loading}
        isEmpty={rows.length === 0}
        columnCount={fields.length + 1}
        empty={{
          title: "No entries yet",
          description: `Add your first ${newLabel.toLowerCase()}.`,
          action: (
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              {newLabel}
            </Button>
          ),
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          getRowHeight={() => "auto"}
        />
      </DataState>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? `Edit ${newLabel.toLowerCase()}` : newLabel}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {fields.map((f) =>
              f.type === "boolean" ? (
                <FormControlLabel
                  key={f.key}
                  control={
                    <Checkbox
                      id={`kb-${f.key}`}
                      checked={(form[f.key] ?? "") === "true"}
                      onChange={(_evt, checked) =>
                        setForm((s) => ({ ...s, [f.key]: checked ? "true" : "" }))
                      }
                    />
                  }
                  label={f.label}
                />
              ) : f.type === "textarea" ? (
                <TextField
                  key={f.key}
                  id={`kb-${f.key}`}
                  label={f.label}
                  multiline
                  minRows={3}
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  helperText={f.helper}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  fullWidth
                />
              ) : (
                <TextField
                  key={f.key}
                  id={`kb-${f.key}`}
                  label={f.type === "money" ? `${f.label} (₹)` : f.label}
                  type={f.type === "number" || f.type === "money" ? "number" : "text"}
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  helperText={f.helper}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  fullWidth
                />
              ),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!requiredOk || !!saving} onClick={submit}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove entry?"
        body="This removes the row from the library. Records that already referenced it keep their snapshot."
        confirmText="Remove"
        onConfirm={() => {
          if (confirmId) onRemove(confirmId);
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />
    </Stack>
  );
}
