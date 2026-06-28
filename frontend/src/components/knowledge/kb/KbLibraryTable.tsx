import {
  Button,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { useState } from "react";
import { formatINR } from "@esti/contracts";
import { ConfirmModal } from "../../ConfirmModal.js";
import { DataState } from "../../DataState.js";

export type KbFieldType = "text" | "textarea" | "number" | "money";

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
}

function display(row: KbRow, f: KbField): string {
  const v = row[f.key];
  if (v === null || v === undefined || v === "") return "—";
  if (f.type === "money") return formatINR(Number(v));
  return String(v);
}

function toForm(row: KbRow | null, fields: KbField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = row?.[f.key];
    if (v === null || v === undefined) out[f.key] = "";
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
}: Props) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
      const raw = (form[f.key] ?? "").trim();
      if (f.type === "money") values[f.key] = raw === "" ? 0 : Math.round(Number(raw) * 100);
      else if (f.type === "number") {
        if (raw !== "") values[f.key] = Number(raw);
      } else if (raw !== "") values[f.key] = raw;
    }
    onSubmit(values, editId);
    setOpen(false);
  }

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={4}>
        <Stack gap={2} className="esti-grow">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </Stack>
        <Button renderIcon={Add} onClick={openNew}>
          {newLabel}
        </Button>
      </Stack>

      <DataState
        loading={!!loading}
        isEmpty={rows.length === 0}
        columnCount={fields.length + 1}
        empty={{
          title: "No entries yet",
          description: `Add your first ${newLabel.toLowerCase()}.`,
          action: (
            <Button size="sm" renderIcon={Add} onClick={openNew}>
              {newLabel}
            </Button>
          ),
        }}
      >
        <TableContainer title={title}>
          <Table>
            <TableHead>
              <TableRow>
                {fields.map((f) => (
                  <TableHeader key={f.key}>{f.label}</TableHeader>
                ))}
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {fields.map((f) => (
                    <TableCell key={f.key}>{display(row, f)}</TableCell>
                  ))}
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Edit}
                        iconDescription="Edit"
                        tooltipPosition="left"
                        onClick={() => openEdit(row)}
                      />
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription="Remove"
                        tooltipPosition="left"
                        onClick={() => setConfirmId(row.id)}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading={editId ? `Edit ${newLabel.toLowerCase()}` : newLabel}
        primaryButtonText={saving ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!requiredOk || !!saving}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={submit}
        size="md"
      >
        <Stack gap={5}>
          {fields.map((f) =>
            f.type === "textarea" ? (
              <TextArea
                key={f.key}
                id={`kb-${f.key}`}
                labelText={f.label}
                rows={3}
                value={form[f.key] ?? ""}
                placeholder={f.placeholder}
                helperText={f.helper}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            ) : (
              <TextInput
                key={f.key}
                id={`kb-${f.key}`}
                labelText={f.type === "money" ? `${f.label} (₹)` : f.label}
                type={f.type === "number" || f.type === "money" ? "number" : "text"}
                value={form[f.key] ?? ""}
                placeholder={f.placeholder}
                helperText={f.helper}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            ),
          )}
        </Stack>
      </Modal>

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
