import { Add } from "@carbon/icons-react";
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
  Tile,
} from "@carbon/react";
import { useMemo, useState } from "react";
import { searchRateItems } from "../core/rateBookIndex.js";
import { inr } from "../lib/download.js";
import { useStore } from "../store.js";

/** Step 2 — search the loaded rate book and add priced items to the estimate. */
export function RateItemPicker() {
  const index = useStore((s) => s.rateBookIndex);
  const items = useStore((s) => s.model.items);
  const addItemFromRate = useStore((s) => s.addItemFromRate);
  const [query, setQuery] = useState("");

  const hits = useMemo(() => (index ? searchRateItems(index, query, 30) : []), [index, query]);
  const addedCodes = useMemo(() => new Set(items.map((i) => i.code)), [items]);

  if (!index) return null;

  return (
    <Tile>
      <Stack gap={4}>
        <div>
          <h2 className="est-h2">Add from rate book</h2>
          <p className="est-help">
            Search by item code or description. Each row is a <strong>rate item</strong> — the priced, fully-specified
            line from CPWD. The description is the specification; rate and unit come from the book.
          </p>
        </div>

        <Search
          id="rate-search"
          labelText="Search rate items"
          placeholder="e.g. brick, 4.1.2, plaster, RCC"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="lg"
        />

        {query.trim() && hits.length === 0 && (
          <p className="est-help">No matches — try a shorter code or keyword.</p>
        )}

        {hits.length > 0 && (
          <TableContainer title="Search results">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Section</TableHeader>
                  <TableHeader>Description / specification</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {hits.map(({ rate, section }) => {
                  const added = addedCodes.has(rate.code);
                  const hasRecipe = (index.recipesByItem.get(rate.code)?.length ?? 0) > 0;
                  return (
                    <TableRow key={rate.code}>
                      <TableCell><code>{rate.code}</code></TableCell>
                      <TableCell>{section}</TableCell>
                      <TableCell>
                        {rate.shortName}
                        {hasRecipe && <Tag type="green" size="sm" style={{ marginLeft: 8 }}>recipe</Tag>}
                      </TableCell>
                      <TableCell>{rate.uom}</TableCell>
                      <TableCell>{inr(rate.ratePaise)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          kind="ghost"
                          renderIcon={Add}
                          disabled={added}
                          onClick={() => addItemFromRate(rate, section)}
                        >
                          {added ? "Added" : "Add"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Tile>
  );
}
