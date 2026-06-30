import { useState } from "react";
import {
  Button,
  InlineNotification,
  NumberInput,
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
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Identification, Renew } from "@carbon/icons-react";
import {
  canonicalUnit,
  parseRateText,
  type ImportFormat,
  type ImportItemRow,
  type ImportMaterialRow,
} from "@esti/contracts";
import { trpc } from "../../../lib/trpc.js";

type EditRow = {
  description: string;
  unit: string; // raw, canonicalised on display + at commit
  rateRupees: number | null;
  code: string | null;
  level: number;
  flags: string[];
};

type Target = "materials" | "items";

const SAMPLE = `1. AC sheet 6 mm thick corrugated    Sqm   160.00
2. Acrylic Exterior Paint             Ltr   250.00
3. AAC blocks 200x100x600 mm          Cum   4683.00`;

export function RateTextImport() {
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ImportFormat | "auto">("auto");
  const [target, setTarget] = useState<Target>("materials");
  const [rows, setRows] = useState<EditRow[] | null>(null);
  const [detected, setDetected] = useState<ImportFormat | null>(null);

  const commitMaterials = trpc.kb.import.commitMaterials.useMutation({
    onSuccess: () => utils.kb.materials.list.invalidate(),
  });
  const commitItems = trpc.kb.import.commitItems.useMutation({
    onSuccess: () => {
      utils.kb.items.list.invalidate();
      utils.kb.specifications.invalidate();
    },
  });
  const result = target === "materials" ? commitMaterials.data : commitItems.data;
  const committing = commitMaterials.isPending || commitItems.isPending;

  function parse() {
    const res = parseRateText(text, format === "auto" ? undefined : format);
    setDetected(res.format);
    setTarget(res.format === "schedule" ? "items" : "materials");
    setRows(
      res.rows.map((r) => ({
        description: r.description,
        unit: r.rawUnit ?? "",
        rateRupees: r.ratePaise == null ? null : r.ratePaise / 100,
        code: r.code,
        level: r.level,
        flags: r.flags,
      })),
    );
    commitMaterials.reset();
    commitItems.reset();
  }

  function setRow(i: number, patch: Partial<EditRow>) {
    setRows((rs) => (rs ? rs.map((r, j) => (j === i ? { ...r, ...patch } : r)) : rs));
  }

  function commit() {
    if (!rows) return;
    const usable = rows.filter((r) => r.description.trim() !== "");
    if (target === "materials") {
      const payload: ImportMaterialRow[] = usable.map((r) => ({
        name: r.description.trim(),
        unit: r.unit.trim() || null,
        ratePaise: r.rateRupees == null ? null : Math.round(r.rateRupees * 100),
        category: null,
      }));
      commitMaterials.mutate({ rows: payload });
    } else {
      const payload: ImportItemRow[] = usable.map((r) => ({
        name: r.description.trim(),
        unit: r.unit.trim() || null,
        ratePaise: r.rateRupees == null ? null : Math.round(r.rateRupees * 100),
        category: null,
        specName: null,
      }));
      commitItems.mutate({ rows: payload });
    }
  }

  const usableCount = (rows ?? []).filter((r) => r.description.trim() !== "").length;

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <h3>Paste &amp; import rates</h3>
        <p className="esti-label esti-label--secondary">
          Paste unstructured text from a PDF rate schedule, OCR, or a vendor quote. It is parsed,
          units are normalised, and rows are matched against existing entries by name + unit — so
          re-imports refresh rates in place instead of creating duplicates.
        </p>
      </Stack>

      <TextArea
        id="rti-text"
        labelText="Raw text"
        placeholder={SAMPLE}
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <Stack orientation="horizontal" gap={5}>
        <Select
          id="rti-format"
          labelText="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value as ImportFormat | "auto")}
        >
          <SelectItem value="auto" text="Auto-detect" />
          <SelectItem value="material" text="Material list" />
          <SelectItem value="schedule" text="Item schedule (DSR/KPWD)" />
        </Select>
        <Button renderIcon={Renew} onClick={parse} disabled={text.trim() === ""}>
          Parse
        </Button>
      </Stack>

      {rows && (
        <Stack gap={4}>
          <Stack orientation="horizontal" gap={5} className="esti-row">
            {detected && (
              <Tag type="blue" size="sm">
                Detected: {detected === "schedule" ? "Item schedule" : "Material list"}
              </Tag>
            )}
            <Tag type="cool-gray" size="sm">{usableCount} rows</Tag>
            <Select
              id="rti-target"
              labelText="Import as"
              hideLabel
              size="sm"
              value={target}
              onChange={(e) => setTarget(e.target.value as Target)}
            >
              <SelectItem value="materials" text="→ Material library" />
              <SelectItem value="items" text="→ Item library (+ rate spec)" />
            </Select>
          </Stack>

          <TableContainer title="Review">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  {detected === "schedule" && <TableHeader>Code</TableHeader>}
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit → canonical</TableHeader>
                  <TableHeader>Rate (₹)</TableHeader>
                  <TableHeader>Flags</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => {
                  const canon = canonicalUnit(r.unit);
                  return (
                    <TableRow key={i}>
                      {detected === "schedule" && (
                        <TableCell>{r.code ?? "—"}</TableCell>
                      )}
                      <TableCell>
                        <TextInput
                          id={`rti-d-${i}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          value={r.description}
                          onChange={(e) => setRow(i, { description: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack orientation="horizontal" gap={2} className="esti-row">
                          <div className="esti-input-sm">
                            <TextInput
                              id={`rti-u-${i}`}
                              labelText=""
                              hideLabel
                              size="sm"
                              value={r.unit}
                              onChange={(e) => setRow(i, { unit: e.target.value })}
                            />
                          </div>
                          {r.unit.trim() !== "" &&
                            (canon ? (
                              <Tag type="green" size="sm">{canon}</Tag>
                            ) : (
                              <Tag type="red" size="sm">unknown</Tag>
                            ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <div className="esti-input-sm">
                          <NumberInput
                            id={`rti-r-${i}`}
                            label=""
                            hideLabel
                            size="sm"
                            value={r.rateRupees ?? 0}
                            min={0}
                            step={0.5}
                            onChange={(_e, { value }) =>
                              setRow(i, { rateRupees: value === "" ? null : Number(value) })
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.flags.length === 0 ? (
                          <Tag type="green" size="sm">ok</Tag>
                        ) : (
                          r.flags.map((f) => (
                            <Tag key={f} type={f === "unknown-unit" ? "cool-gray" : "red"} size="sm">
                              {f}
                            </Tag>
                          ))
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack orientation="horizontal" gap={5} className="esti-row">
            <Button
              renderIcon={Identification}
              onClick={commit}
              disabled={committing || usableCount === 0}
            >
              {committing ? "Importing…" : `Import ${usableCount} rows`}
            </Button>
          </Stack>

          {result && (
            <InlineNotification
              kind="success"
              title="Import complete"
              subtitle={`${result.inserted} inserted · ${result.updated} updated · ${result.skipped} skipped (duplicates / unusable)`}
              lowContrast
              hideCloseButton
            />
          )}
          {(commitMaterials.error || commitItems.error) && (
            <InlineNotification
              kind="error"
              title="Import failed"
              subtitle={(commitMaterials.error || commitItems.error)?.message}
              lowContrast
              hideCloseButton
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
