import { useState } from "react";
import {
  Button,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { DataState } from "../../DataState.js";

export interface NumField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface MappingRow {
  id: string;
  targetLabel: string;
  targetSub?: string;
  values: Record<string, number>;
}

interface Props {
  title: string;
  selectLabel: string;
  addLabel: string;
  options: { id: string; label: string }[];
  numFields: NumField[];
  rows: MappingRow[];
  loading?: boolean;
  saving?: boolean;
  onAdd: (targetId: string, values: Record<string, number>) => void;
  onRemove: (id: string) => void;
}

/** A data-mapper / db-connector panel: connect a row from one library (options)
 *  to the parent record with one or more numeric measures, listed as a table. */
export function MappingPanel({
  title,
  selectLabel,
  addLabel,
  options,
  numFields,
  rows,
  loading,
  saving,
  onAdd,
  onRemove,
}: Props) {
  const [targetId, setTargetId] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});

  function add() {
    if (!targetId) return;
    const out: Record<string, number> = {};
    for (const f of numFields) out[f.key] = Number(vals[f.key] ?? "") || 0;
    onAdd(targetId, out);
    setTargetId("");
    setVals({});
  }

  return (
    <Stack gap={4}>
      <h4>{title}</h4>
      <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <Select
          id={`map-${selectLabel}`}
          labelText={selectLabel}
          value={targetId}
          disabled={options.length === 0}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <SelectItem value="" text={options.length ? "Select…" : "Library empty"} />
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id} text={o.label} />
          ))}
        </Select>
        {numFields.map((f) => (
          <TextInput
            key={f.key}
            id={`map-${selectLabel}-${f.key}`}
            labelText={f.label}
            type="number"
            placeholder={f.placeholder}
            value={vals[f.key] ?? ""}
            onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
          />
        ))}
        <Button renderIcon={Add} onClick={add} disabled={!targetId || !!saving}>
          {addLabel}
        </Button>
      </Stack>

      <DataState
        loading={!!loading}
        isEmpty={rows.length === 0}
        columnCount={numFields.length + 2}
        empty={{
          title: "Nothing mapped yet",
          description: `Pick a ${selectLabel.toLowerCase()} above and add it.`,
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{selectLabel}</TableHeader>
                {numFields.map((f) => (
                  <TableHeader key={f.key}>{f.label}</TableHeader>
                ))}
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.targetLabel}
                    {row.targetSub ? ` (${row.targetSub})` : ""}
                  </TableCell>
                  {numFields.map((f) => (
                    <TableCell key={f.key}>{row.values[f.key] ?? 0}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription="Remove"
                      tooltipPosition="left"
                      onClick={() => onRemove(row.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
