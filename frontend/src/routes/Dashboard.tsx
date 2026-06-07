import { ClickableTile, Tag, Tile } from "@carbon/react";
import { Building } from "@carbon/pictograms-react";
import { formatINRShort } from "@esti/contracts";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

function Kpi({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Tile style={{ minWidth: 180 }}>
      <p style={{ fontSize: 12, color: "#6f6f6f" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{value}</p>
      {helper && <p style={{ fontSize: 12, color: "#6f6f6f" }}>{helper}</p>}
    </Tile>
  );
}

export function Dashboard() {
  const summary = trpc.dashboard.summary.useQuery();
  const s = summary.data;
  const navigate = useNavigate();

  const active = s?.projects.byStatus.ACTIVE ?? 0;
  const enquiry = s?.projects.byStatus.ENQUIRY ?? 0;
  const completed = s?.projects.byStatus.COMPLETED ?? 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Building width={48} height={48} />
        <div>
          <h1>Office dashboard</h1>
          <p>Architectural Office Resource Management System</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        <Kpi
          label="Projects"
          value={String(s?.projects.total ?? "…")}
          helper={`${active} active · ${enquiry} enquiry · ${completed} completed`}
        />
        <Kpi
          label="Contract value"
          value={s ? formatINRShort(s.projects.contractValuePaise) : "…"}
          helper="Across all project offices"
        />
        <Kpi
          label="Outstanding (net of TDS)"
          value={s ? formatINRShort(s.invoices.outstandingPaise) : "…"}
          helper={s ? `${formatINRShort(s.invoices.collectedPaise)} collected` : undefined}
        />
        <Kpi
          label="Invoiced"
          value={s ? formatINRShort(s.invoices.invoicedPaise) : "…"}
          helper="Issued + paid, gross"
        />
      </div>

      <h3 style={{ marginTop: 32 }}>Compliance &amp; alerts</h3>
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <Tile style={{ minWidth: 220 }}>
          <p style={{ fontSize: 12, color: "#6f6f6f" }}>Permits</p>
          <p style={{ fontSize: 28, fontWeight: 600 }}>{s?.permits.open ?? "…"}</p>
          <p style={{ fontSize: 12, color: "#6f6f6f" }}>open of {s?.permits.total ?? 0} total</p>
          {!!s?.permits.overdue && (
            <Tag type="red" style={{ marginTop: 8 }}>
              {s.permits.overdue} overdue
            </Tag>
          )}
        </Tile>
        <Tile style={{ minWidth: 220 }}>
          <p style={{ fontSize: 12, color: "#6f6f6f" }}>Fee proposals</p>
          <p style={{ fontSize: 28, fontWeight: 600 }}>{s?.feeProposals.total ?? "…"}</p>
          {!!s?.feeProposals.belowMinimum && (
            <Tag type="magenta" style={{ marginTop: 8 }}>
              {s.feeProposals.belowMinimum} below COA minimum
            </Tag>
          )}
        </Tile>
        <ClickableTile onClick={() => navigate("/projects")} style={{ minWidth: 220 }}>
          <p style={{ fontSize: 12, color: "#6f6f6f" }}>Go to</p>
          <p style={{ fontSize: 20, fontWeight: 600 }}>Project offices →</p>
        </ClickableTile>
      </div>

      {s?.hr && (
        <>
          <h3 style={{ marginTop: 32 }}>Team &amp; HR</h3>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <ClickableTile onClick={() => navigate("/team")} style={{ minWidth: 200 }}>
              <p style={{ fontSize: 12, color: "#6f6f6f" }}>Headcount</p>
              <p style={{ fontSize: 28, fontWeight: 600 }}>{s.hr.headcount}</p>
              <p style={{ fontSize: 12, color: "#6f6f6f" }}>active staff</p>
            </ClickableTile>
            <ClickableTile onClick={() => navigate("/hr")} style={{ minWidth: 200 }}>
              <p style={{ fontSize: 12, color: "#6f6f6f" }}>Pending leaves</p>
              <p style={{ fontSize: 28, fontWeight: 600 }}>{s.hr.pendingLeaves}</p>
              {!!s.hr.pendingLeaves && (
                <Tag type="blue" style={{ marginTop: 8 }}>
                  awaiting approval
                </Tag>
              )}
            </ClickableTile>
            <ClickableTile onClick={() => navigate("/hr")} style={{ minWidth: 200 }}>
              <p style={{ fontSize: 12, color: "#6f6f6f" }}>Unpaid payslips</p>
              <p style={{ fontSize: 28, fontWeight: 600 }}>{s.hr.unpaidPayslips}</p>
              <p style={{ fontSize: 12, color: "#6f6f6f" }}>{formatINRShort(s.hr.unpaidNetPaise)} due</p>
            </ClickableTile>
          </div>
        </>
      )}
    </div>
  );
}
