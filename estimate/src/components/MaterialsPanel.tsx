import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { useMemo } from "react";
import { computeMaterialsFromItems } from "../core/materialExtract.js";
import { inr } from "../lib/download.js";
import { useStore } from "../store.js";

/**
 * Step 4 — material take-off auto-derived from item quantities × rate-book recipes.
 * qty(material) = itemQty × coefficient × (1 + wastage%).
 */
export function MaterialsPanel() {
  const items = useStore((s) => s.model.items);
  const index = useStore((s) => s.rateBookIndex);

  const materials = useMemo(() => computeMaterialsFromItems(items, index), [items, index]);

  if (!index) return null;

  return (
    <Stack gap={4}>
      <div>
        <h2 className="est-h2">Material take-off</h2>
        <p className="est-help">
          Computed from measured item quantities and CPWD cement-consumption recipes. Procurement view — not added to
          the abstract total (item rates already include labour + material).
        </p>
      </div>

      {materials.length === 0 ? (
        <Tile>
          <p className="est-help">
            No material recipes for the items in this estimate yet. CPWD pack includes cement coefficients for concrete
            items (chapter 4.x). Add RCC/concrete items to see cement take-off.
          </p>
        </Tile>
      ) : (
        <TableContainer title="Materials">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Material</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>From items</TableHeader>
                <TableHeader>Est. value</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.code}>
                  <TableCell><code>{m.code}</code></TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell>{m.qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell>
                    {m.fromItems.map((c) => (
                      <Tag key={c} type="gray" size="sm" style={{ marginRight: 4 }}>{c}</Tag>
                    ))}
                  </TableCell>
                  <TableCell>{m.ratePaise != null ? inr(Math.round(m.qty * m.ratePaise)) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
