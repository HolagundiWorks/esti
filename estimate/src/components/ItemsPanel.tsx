import { Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  NumberInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import type { MeasurementFactor } from "@esti/contracts";
import { itemQty } from "../core/itemQty.js";
import { measureQtyFromTemplate, templateHint } from "../core/measurement.js";
import { useStore } from "../store.js";
import { inr } from "../lib/download.js";

function dimValue(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

function parseDim(value: string | number): number | null {
  if (value === "" || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function DimCell({
  id,
  factor,
  value,
  onChange,
}: {
  id: string;
  factor: MeasurementFactor;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  if (factor.mode === "OFF") return <TableCell>—</TableCell>;
  if (factor.mode === "FIXED") {
    return (
      <TableCell>
        <Tag type="gray" size="sm">{factor.value}</Tag>
      </TableCell>
    );
  }
  return (
    <TableCell>
      <NumberInput
        size="sm"
        hideLabel
        label=""
        id={id}
        min={0}
        value={dimValue(value)}
        onChange={(_e, { value: v }) => onChange(parseDim(v))}
      />
    </TableCell>
  );
}

/** Step 3 — measurement sheets for items added from the rate book. */
export function ItemsPanel() {
  const items = useStore((s) => s.model.items);
  const index = useStore((s) => s.rateBookIndex);
  const { removeItem, addMeasure, updateMeasure, removeMeasure } = useStore();

  if (!index) {
    return (
      <Tile>
        <p className="est-help">Load a rate book, then add items to start measuring.</p>
      </Tile>
    );
  }

  if (items.length === 0) {
    return (
      <Tile>
        <p className="est-help">No items in this estimate — search the rate book above and click Add.</p>
      </Tile>
    );
  }

  return (
    <Stack gap={5}>
      <h2 className="est-h2">Measurements</h2>

      {items.map((it) => {
        const template = it.measurementTemplate;
        const qty = itemQty(it);
        const amount = Math.round(qty * it.ratePaise) + Math.round(qty * (it.leadChargePaise ?? 0));
        const recipes = index.recipesByItem.get(it.code)?.length ?? 0;

        return (
          <Tile key={it.id}>
            <Stack gap={4}>
              <Stack gap={2}>
                <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap", alignItems: "center" }}>
                  <Tag type="blue">{it.code}</Tag>
                  {it.derivedFrom && <Tag type="purple" size="sm">derived from {it.derivedFrom}</Tag>}
                  <Tag type="gray">{it.section}</Tag>
                  <Tag type="gray">{it.uom}</Tag>
                  <Tag type="teal">{inr(it.ratePaise)}/{it.uom}</Tag>
                  {recipes > 0 && <Tag type="green" size="sm">{recipes} material recipe{recipes > 1 ? "s" : ""}</Tag>}
                  <Button hasIconOnly size="md" kind="ghost" renderIcon={TrashCan} iconDescription="Remove item" onClick={() => removeItem(it.id)} disabled={Boolean(it.derivedFrom)} />
                </Stack>
                <p className="est-help"><strong>{it.shortName}</strong></p>
                {it.specification && it.specification !== it.shortName && (
                  <p className="est-help" style={{ whiteSpace: "pre-wrap" }}>{it.specification}</p>
                )}
                {template && <p className="est-help">{templateHint(template)}</p>}
              </Stack>

              {it.derivedFrom ? (
                <p className="est-help">
                  Qty {qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })} {it.uom} · {inr(amount)} — auto-derived; edit the parent item measurements to change.
                </p>
              ) : (
                <>
              <TableContainer title="Measurement sheet" description={`Qty ${qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${it.uom} · ${inr(amount)}`}>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Nos</TableHeader>
                      <TableHeader>L (m)</TableHeader>
                      <TableHeader>B (m)</TableHeader>
                      <TableHeader>H (m)</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {it.measurements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <TextInput size="sm" hideLabel labelText="" id={`md-${m.id}`} value={m.desc ?? ""} onChange={(e) => updateMeasure(it.id, m.id, { desc: e.target.value })} />
                        </TableCell>
                        {template ? (
                          <>
                            <DimCell id={`mn-${m.id}`} factor={template.nos} value={m.nos} onChange={(nos) => updateMeasure(it.id, m.id, { nos: nos ?? 1 })} />
                            <DimCell id={`ml-${m.id}`} factor={template.l} value={m.l} onChange={(l) => updateMeasure(it.id, m.id, { l })} />
                            <DimCell id={`mb-${m.id}`} factor={template.b} value={m.b} onChange={(b) => updateMeasure(it.id, m.id, { b })} />
                            <DimCell id={`mh-${m.id}`} factor={template.h} value={m.h} onChange={(h) => updateMeasure(it.id, m.id, { h })} />
                            <TableCell>
                              {template
                                ? measureQtyFromTemplate(m, template).toLocaleString("en-IN", { maximumFractionDigits: 3 })
                                : "—"}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell><NumberInput size="sm" hideLabel label="" id={`mn-${m.id}`} min={0} value={m.nos} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { nos: Number(value) || 1 })} /></TableCell>
                            <TableCell><NumberInput size="sm" hideLabel label="" id={`ml-${m.id}`} value={dimValue(m.l)} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { l: parseDim(value) })} /></TableCell>
                            <TableCell><NumberInput size="sm" hideLabel label="" id={`mb-${m.id}`} value={dimValue(m.b)} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { b: parseDim(value) })} /></TableCell>
                            <TableCell><NumberInput size="sm" hideLabel label="" id={`mh-${m.id}`} value={dimValue(m.h)} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { h: parseDim(value) })} /></TableCell>
                            <TableCell>{measureQtyFromTemplate(m, { nos: { mode: "PUNCHED" }, l: { mode: "PUNCHED" }, b: { mode: "PUNCHED" }, h: { mode: "PUNCHED" } }).toLocaleString("en-IN", { maximumFractionDigits: 3 })}</TableCell>
                          </>
                        )}
                        <TableCell>
                          <Button hasIconOnly size="sm" kind="ghost" renderIcon={TrashCan} iconDescription="Remove row" onClick={() => removeMeasure(it.id, m.id)} disabled={it.measurements.length <= 1} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button size="sm" kind="ghost" renderIcon={Add} onClick={() => addMeasure(it.id)}>
                Add measurement row
              </Button>
                </>
              )}
            </Stack>
          </Tile>
        );
      })}
    </Stack>
  );
}
