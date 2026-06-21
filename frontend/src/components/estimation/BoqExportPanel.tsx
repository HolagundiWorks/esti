import { Button } from "@carbon/react";
import { Close, Printer } from "@carbon/icons-react";
import type { NodeState } from "./paramNodes.js";

interface Props {
  nodes: NodeState[];
  onClose: () => void;
}

function fmtQty(v: number | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}
function fmtINR(rupees: number | null | undefined) {
  if (rupees == null) return "—";
  return "₹" + Number(rupees).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function BoqExportPanel({ nodes, onClose }: Props) {
  const boqNodes = nodes.filter((n) => n.kind === "boq_line");
  const grandTotal = boqNodes.reduce((s, n) => s + (n.outputs.amount ?? 0), 0);

  // Group by estimateId if present
  const grouped: { label: string; items: NodeState[] }[] = [];
  const seenEstimates = new Set<string>();

  for (const n of boqNodes) {
    const eid = n.meta?.estimateId ?? "__manual__";
    if (!seenEstimates.has(eid)) {
      seenEstimates.add(eid);
      grouped.push({
        label: eid === "__manual__"
          ? "Manual items"
          : (n.meta?.description ? "Estimate items" : "BOQ items"),
        items: [],
      });
    }
    const last = grouped[grouped.length - 1];
    last?.items.push(n);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "var(--cds-background)",
      display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 24px",
        borderBottom: "1px solid var(--cds-border-subtle-01)",
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>
          Bill of Quantities — Parametric Estimate
        </h2>
        <Button
          size="sm" kind="ghost"
          renderIcon={Printer}
          onClick={() => window.print()}
        >
          Print
        </Button>
        <Button size="sm" kind="ghost" renderIcon={Close} hasIconOnly iconDescription="Close" onClick={onClose} />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {boqNodes.length === 0 ? (
          <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
            No BOQ items on canvas. Add a BOQ Line node and connect quantity inputs.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--cds-border-strong-01)" }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Description</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Rate (₹)</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {boqNodes.map((node, idx) => {
                const qty = node.outputs.qty_echo ?? 0;
                const rate = node.params.rate ?? 0;
                const amount = node.outputs.amount ?? 0;
                const unit = node.meta?.unit ?? "NOS";
                return (
                  <tr
                    key={node.id}
                    style={{ borderBottom: "1px solid var(--cds-border-subtle-00)" }}
                  >
                    <td style={tdCenter}>{idx + 1}</td>
                    <td style={{ ...tdBase, paddingLeft: 8 }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>{node.label}</p>
                      {node.meta?.description && node.meta.description !== node.label && (
                        <p style={{ margin: 0, fontSize: 11, color: "var(--cds-text-secondary)", marginTop: 2 }}>
                          {node.meta.description}
                        </p>
                      )}
                    </td>
                    <td style={tdCenter}>{unit}</td>
                    <td style={tdRight}>{fmtQty(qty)}</td>
                    <td style={tdRight}>{fmtINR(rate)}</td>
                    <td style={{ ...tdRight, fontWeight: 600 }}>{fmtINR(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--cds-border-strong-01)" }}>
                <td colSpan={5} style={{ ...tdBase, textAlign: "right", fontWeight: 700, fontSize: 14, paddingRight: 16 }}>
                  Grand Total
                </td>
                <td style={{ ...tdRight, fontWeight: 700, fontSize: 15, color: "var(--cds-interactive)" }}>
                  {fmtINR(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "right",
  fontWeight: 600,
  color: "var(--cds-text-secondary)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};
const tdBase: React.CSSProperties = { padding: "10px 8px", verticalAlign: "middle" };
const tdCenter: React.CSSProperties = { ...tdBase, textAlign: "center" };
const tdRight: React.CSSProperties = { ...tdBase, textAlign: "right" };
