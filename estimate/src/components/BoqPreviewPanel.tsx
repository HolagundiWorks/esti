import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import type { CostedEstimate } from "@esti/contracts";
import { inr } from "../lib/download.js";

/** BOQ preview — abstract grouped by section. */
export function BoqPreviewPanel({ costed }: { costed: CostedEstimate | null }) {
  if (!costed || costed.boq.sections.length === 0) {
    return (
      <Tile>
        <p className="est-help">Add measured items to see the BOQ abstract grouped by section.</p>
      </Tile>
    );
  }

  return (
    <Stack gap={5}>
      <div>
        <h2 className="est-h2">BOQ abstract</h2>
        <p className="est-help">
          Bill of quantities — item rate × measured qty, grouped by CPWD chapter/section. Total:{" "}
          <strong>{inr(costed.abstract.totalCostedPaise)}</strong>
        </p>
      </div>

      {costed.boq.sections.map((sec) => (
        <TableContainer key={sec.section} title={sec.section} description={`Subtotal ${inr(sec.subtotalPaise)}`}>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader>Amount</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {sec.rows.map((row) => (
                <TableRow key={row.code}>
                  <TableCell><code>{row.code}</code></TableCell>
                  <TableCell>{row.shortName}</TableCell>
                  <TableCell>{row.uom}</TableCell>
                  <TableCell>{row.qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell>{inr(row.ratePaise)}</TableCell>
                  <TableCell>{inr(row.amountPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ))}
    </Stack>
  );
}
