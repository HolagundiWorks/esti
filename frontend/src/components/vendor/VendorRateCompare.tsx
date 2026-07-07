import { useState } from "react";
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { formatINR } from "@esti/contracts";
import { StatusDot } from "../StatusTag.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

/** Cross-vendor rate comparison for one material — cheapest quote per vendor. Material UI. */
export function VendorRateCompare() {
  const [term, setTerm] = useState("");
  const [material, setMaterial] = useState<string | null>(null);
  const compareQ = trpc.vendors.quotes.compare.useQuery(
    { materialName: material! },
    { enabled: !!material },
  );
  const rows = compareQ.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h6" component="h4">Compare vendor rates</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          id="vrc-search"
          label="Material"
          placeholder="Material name (exact, as quoted) — e.g. OPC 53 cement"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && term.trim()) setMaterial(term.trim());
          }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          sx={{ height: 56 }}
          onClick={() => term.trim() && setMaterial(term.trim())}
          disabled={!term.trim()}
        >
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>Quote</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Rate</TableCell>
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
                    {r.isLowest && (
                      <StatusDot color="green" label="lowest" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      )}
    </Stack>
  );
}
