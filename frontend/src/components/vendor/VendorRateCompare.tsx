import { useState } from "react";
import {
  Button,
  Search,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

/** Cross-vendor rate comparison for one material — cheapest quote per vendor. */
export function VendorRateCompare() {
  const [term, setTerm] = useState("");
  const [material, setMaterial] = useState<string | null>(null);
  const compareQ = trpc.vendors.quotes.compare.useQuery(
    { materialName: material! },
    { enabled: !!material },
  );
  const rows = compareQ.data ?? [];

  return (
    <Stack gap={4}>
      <h4>Compare vendor rates</h4>
      <Stack orientation="horizontal" gap={3} className="esti-row">
        <Search
          id="vrc-search"
          size="lg"
          labelText="Material"
          placeholder="Material name (exact, as quoted) — e.g. OPC 53 cement"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && term.trim()) setMaterial(term.trim());
          }}
        />
        <Button size="md" onClick={() => term.trim() && setMaterial(term.trim())} disabled={!term.trim()}>
          Compare
        </Button>
      </Stack>

      {material && (
        <DataState
          loading={compareQ.isLoading}
          isEmpty={!compareQ.isLoading && rows.length === 0}
          empty={{ title: "No quotes", description: `No vendor quotes found for “${material}”.` }}
          columnCount={5}
        >
          <TableContainer title={`Latest quote per vendor — “${material}”`}>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Vendor</TableHeader>
                  <TableHeader>Quote</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Rate</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.vendorId}>
                    <TableCell>{r.vendorName}</TableCell>
                    <TableCell>{r.quoteRef}</TableCell>
                    <TableCell>{r.quoteDate}</TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell>
                      {formatINR(r.ratePaise)}{" "}
                      {r.isLowest && <Tag type="green" size="sm">lowest</Tag>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      )}
    </Stack>
  );
}
