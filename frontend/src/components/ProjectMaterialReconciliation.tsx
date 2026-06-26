import {
  Column,
  DataTableSkeleton,
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
  MATERIAL_RECON_STATUS_LABEL,
  MATERIAL_RECON_STATUS_TAG,
  type MaterialReconStatus,
  formatINRShort,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

export function ProjectMaterialReconciliation({ projectId }: { projectId: string }) {
  const q = trpc.grn.materialReconciliation.useQuery({ projectId });
  const data = q.data;

  if (q.isLoading) return <DataTableSkeleton columnCount={9} rowCount={5} showHeader={false} showToolbar={false} />;
  if (q.error) return <p className="esti-label--secondary" style={{ color: "var(--cds-support-error)" }}>{q.error.message}</p>;
  if (!data || data.items.length === 0) {
    return (
      <Stack gap={3}>
        <h4 style={{ margin: 0 }}>Material Reconciliation</h4>
        <p className="esti-label--secondary">
          No data yet. Record verified GRNs against work-package items to populate this view.
        </p>
      </Stack>
    );
  }

  const { items, totals } = data;

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)" }}>
        <h4 style={{ margin: 0 }}>Material Reconciliation</h4>
        <Tag type="gray" size="sm">{totals.itemCount} items</Tag>
      </div>

      {/* KPI strip */}
      <Grid condensed>
        {[
          { label: "Contracted value", value: formatINRShort(totals.contractedValuePaise) },
          { label: "Received value", value: formatINRShort(totals.receivedValuePaise) },
          { label: "Billed value", value: formatINRShort(totals.billedValuePaise) },
          { label: "On-site stock", value: formatINRShort(totals.onSiteValuePaise) },
          { label: "Pending delivery", value: formatINRShort(totals.pendingDeliveryValuePaise) },
        ].map((k) => (
          <Column key={k.label} sm={2} md={2} lg={3}>
            <Tile style={{ padding: "var(--cds-spacing-04)" }}>
              <p className="esti-label--secondary">{k.label}</p>
              <p style={{ fontSize: "1.125rem", fontWeight: 600, marginTop: "var(--cds-spacing-02)" }}>{k.value}</p>
            </Tile>
          </Column>
        ))}
      </Grid>

      {/* Items table */}
      <TableContainer>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Description</TableHeader>
              <TableHeader>Work package</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>Contracted</TableHeader>
              <TableHeader>Received</TableHeader>
              <TableHeader>Billed</TableHeader>
              <TableHeader>On site</TableHeader>
              <TableHeader>Pending delivery</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.workPackageItemId}>
                <TableCell>{it.description}</TableCell>
                <TableCell className="esti-label">{it.workPackageRef}</TableCell>
                <TableCell>{it.unit}</TableCell>
                <TableCell>{fmtQty(it.contractedQty)}</TableCell>
                <TableCell
                  style={it.receivedQty > it.contractedQty ? { color: "var(--cds-support-error)" } : undefined}
                >
                  {fmtQty(it.receivedQty)}
                </TableCell>
                <TableCell>{fmtQty(it.billedQty)}</TableCell>
                <TableCell style={it.onSiteQty > 0 ? { color: "var(--cds-support-warning-text)" } : undefined}>
                  {fmtQty(it.onSiteQty)}
                </TableCell>
                <TableCell style={it.pendingDeliveryQty > 0 ? { color: "var(--cds-support-info)" } : undefined}>
                  {fmtQty(it.pendingDeliveryQty)}
                </TableCell>
                <TableCell>
                  <Tag
                    type={MATERIAL_RECON_STATUS_TAG[it.status as MaterialReconStatus] ?? "gray"}
                    size="sm"
                  >
                    {MATERIAL_RECON_STATUS_LABEL[it.status as MaterialReconStatus] ?? it.status}
                  </Tag>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
