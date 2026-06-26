import {
  Column,
  Grid,
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
import {
  PROCUREMENT_STATUS_LABEL,
  PROCUREMENT_STATUS_TAG,
  type ProcurementStatus,
  formatINR,
  formatINRShort,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";

function fmtQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}

export function ProjectProcurementForecast({ projectId }: { projectId: string }) {
  const q = trpc.dashboard.procurementForecast.useQuery({ projectId });

  if (q.isLoading || !q.data) {
    return (
      <DataState loading isEmpty={false} empty={{ title: "" }} columnCount={4}>
        {null}
      </DataState>
    );
  }
  if (q.isError) {
    return (
      <DataState loading={false} isEmpty empty={{ title: "Error", description: q.error.message }} columnCount={4}>
        {null}
      </DataState>
    );
  }

  const { totals, byCostHead, byPackage, items } = q.data!;

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <h4>Procurement Forecast</h4>
        <p className="esti-label--secondary">
          Outstanding quantities still to be procured or executed — contracted minus billed,
          valued at awarded rates. Advisory only; nothing here approves or books a purchase.
        </p>
      </Stack>

      {/* --- KPI tiles ------------------------------------------------------- */}
      <Grid narrow>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <p className="esti-label--helper">Contracted value</p>
            <p><strong>{formatINR(totals.contractedValuePaise)}</strong></p>
            <p className="esti-label--helper">{totals.itemCount} items · {totals.packageCount} packages</p>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <p className="esti-label--helper">Billed to date</p>
            <p><strong>{formatINR(totals.billedValuePaise)}</strong></p>
            <p className="esti-label--helper">
              {totals.contractedValuePaise > 0
                ? `${Math.round((totals.billedValuePaise / totals.contractedValuePaise) * 100)}% executed`
                : "—"}
            </p>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <p className="esti-label--helper">Outstanding</p>
            <p><strong>{formatINR(totals.outstandingValuePaise)}</strong></p>
            <p className="esti-label--helper">{totals.outstandingItemCount} item(s) remaining</p>
          </Tile>
        </Column>
      </Grid>

      {/* --- By cost head summary --------------------------------------------- */}
      {byCostHead.length > 0 && (
        <TableContainer
          title="By trade / cost head"
          description="Outstanding value aggregated per cost head — highest first."
        >
          <Table size="sm" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>Cost head</TableHeader>
                <TableHeader>Items</TableHeader>
                <TableHeader>Contracted</TableHeader>
                <TableHeader>Billed</TableHeader>
                <TableHeader>Outstanding</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {byCostHead.map((ch) => (
                <TableRow key={ch.costHead}>
                  <TableCell>{ch.costHead}</TableCell>
                  <TableCell>
                    {ch.outstandingItemCount > 0
                      ? `${ch.outstandingItemCount} / ${ch.itemCount}`
                      : <Tag type="cool-gray" size="sm">All done</Tag>}
                  </TableCell>
                  <TableCell>{formatINRShort(ch.contractedValuePaise)}</TableCell>
                  <TableCell>{formatINRShort(ch.billedValuePaise)}</TableCell>
                  <TableCell>
                    <strong>{formatINRShort(ch.outstandingValuePaise)}</strong>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --- By work package summary ------------------------------------------ */}
      {byPackage.length > 0 && (
        <TableContainer
          title="By work package"
          description="Outstanding value and status per awarded work package."
        >
          <Table size="sm" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Package</TableHeader>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Contracted</TableHeader>
                <TableHeader>Billed</TableHeader>
                <TableHeader>Outstanding</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {byPackage.map((p) => (
                <TableRow key={p.workPackageId}>
                  <TableCell>{p.ref}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.contractor ?? "—"}</TableCell>
                  <TableCell>{formatINRShort(p.contractedValuePaise)}</TableCell>
                  <TableCell>{formatINRShort(p.billedValuePaise)}</TableCell>
                  <TableCell><strong>{formatINRShort(p.outstandingValuePaise)}</strong></TableCell>
                  <TableCell>
                    <Tag type={PROCUREMENT_STATUS_TAG[p.status as ProcurementStatus]} size="sm">
                      {PROCUREMENT_STATUS_LABEL[p.status as ProcurementStatus]}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --- Per-item detail table -------------------------------------------- */}
      {items.length === 0 ? (
        <Tile>
          <p className="esti-label--secondary">
            No work-package items found. Award work packages and add BOQ items to see the
            procurement forecast.
          </p>
        </Tile>
      ) : (
        <TableContainer
          title="Item-wise outstanding"
          description="All work-package items sorted by outstanding value (highest first). Advisory — for procurement planning only."
        >
          <Table size="sm" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>Package</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Cost head</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Contracted qty</TableHeader>
                <TableHeader>Billed qty</TableHeader>
                <TableHeader>Outstanding qty</TableHeader>
                <TableHeader>Rate (₹)</TableHeader>
                <TableHeader>Outstanding value</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={`${it.workPackageId}-${idx}`}>
                  <TableCell>{it.workPackageRef}</TableCell>
                  <TableCell>{it.description}</TableCell>
                  <TableCell>{it.costHead}</TableCell>
                  <TableCell>{it.unit}</TableCell>
                  <TableCell>{fmtQty(it.contractedQty)}</TableCell>
                  <TableCell>{fmtQty(it.billedQty)}</TableCell>
                  <TableCell><strong>{fmtQty(it.outstandingQty)}</strong></TableCell>
                  <TableCell>{formatINRShort(it.ratePaise)}</TableCell>
                  <TableCell><strong>{formatINRShort(it.outstandingValuePaise)}</strong></TableCell>
                  <TableCell>
                    <Tag type={PROCUREMENT_STATUS_TAG[it.status as ProcurementStatus]} size="sm">
                      {PROCUREMENT_STATUS_LABEL[it.status as ProcurementStatus]}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
