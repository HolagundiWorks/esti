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
  TextInput,
  Tile,
} from "@carbon/react";
import { measureQty } from "@esti/contracts";
import { useStore } from "../store.js";
import { inr } from "../lib/download.js";

const num = (v: string | number): number => Number(v) || 0;

/** Work items with their measurement sheets. Quantity = Σ nos·L·B·H (blanks skip). */
export function ItemsPanel() {
  const items = useStore((s) => s.model.items);
  const { addItem, updateItem, removeItem, addMeasure, updateMeasure, removeMeasure } = useStore();

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
        <h2 className="est-h2">Items</h2>
        <Button size="sm" kind="tertiary" renderIcon={Add} onClick={addItem}>
          Add item
        </Button>
      </Stack>

      {items.length === 0 && <p className="est-help">No items yet — add one to start measuring.</p>}

      {items.map((it) => {
        const qty = it.measurements.reduce((s, m) => s + measureQty({ nos: m.nos, l: m.l, b: m.b, h: m.h }), 0);
        const amount = Math.round(qty * it.ratePaise) + Math.round(qty * (it.leadChargePaise ?? 0));
        return (
          <Tile key={it.id}>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                <TextInput id={`code-${it.id}`} labelText="Code" value={it.code} onChange={(e) => updateItem(it.id, { code: e.target.value })} className="est-w-sm" />
                <TextInput id={`name-${it.id}`} labelText="Description" value={it.shortName} onChange={(e) => updateItem(it.id, { shortName: e.target.value })} className="est-grow" />
                <TextInput id={`uom-${it.id}`} labelText="Unit" value={it.uom} onChange={(e) => updateItem(it.id, { uom: e.target.value })} className="est-w-xs" />
                <NumberInput id={`rate-${it.id}`} label="Rate (₹)" min={0} value={it.ratePaise / 100} onChange={(_e, { value }) => updateItem(it.id, { ratePaise: Math.round(num(value) * 100) })} className="est-w-sm" />
                <TextInput id={`sec-${it.id}`} labelText="Section (BOQ group)" value={it.section ?? ""} onChange={(e) => updateItem(it.id, { section: e.target.value })} className="est-w-sm" />
                <Button hasIconOnly size="md" kind="ghost" renderIcon={TrashCan} iconDescription="Remove item" onClick={() => removeItem(it.id)} />
              </Stack>

              <TableContainer title="Measurements" description={`Qty ${qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${it.uom} · amount ${inr(amount)}`}>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Nos</TableHeader>
                      <TableHeader>L</TableHeader>
                      <TableHeader>B</TableHeader>
                      <TableHeader>H</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {it.measurements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <TextInput size="sm" id={`md-${m.id}`} labelText="" hideLabel value={m.desc ?? ""} onChange={(e) => updateMeasure(it.id, m.id, { desc: e.target.value })} />
                        </TableCell>
                        <TableCell><NumberInput size="sm" id={`mn-${m.id}`} hideLabel label="" min={0} value={m.nos} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { nos: num(value) })} /></TableCell>
                        <TableCell><NumberInput size="sm" id={`ml-${m.id}`} hideLabel label="" value={m.l ?? 0} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { l: value === "" ? null : num(value) })} /></TableCell>
                        <TableCell><NumberInput size="sm" id={`mb-${m.id}`} hideLabel label="" value={m.b ?? 0} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { b: value === "" ? null : num(value) })} /></TableCell>
                        <TableCell><NumberInput size="sm" id={`mh-${m.id}`} hideLabel label="" value={m.h ?? 0} onChange={(_e, { value }) => updateMeasure(it.id, m.id, { h: value === "" ? null : num(value) })} /></TableCell>
                        <TableCell>{measureQty({ nos: m.nos, l: m.l, b: m.b, h: m.h }).toLocaleString("en-IN", { maximumFractionDigits: 3 })}</TableCell>
                        <TableCell><Button hasIconOnly size="sm" kind="ghost" renderIcon={TrashCan} iconDescription="Remove row" onClick={() => removeMeasure(it.id, m.id)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button size="sm" kind="ghost" renderIcon={Add} onClick={() => addMeasure(it.id)}>
                Add measurement row
              </Button>
            </Stack>
          </Tile>
        );
      })}
    </Stack>
  );
}
