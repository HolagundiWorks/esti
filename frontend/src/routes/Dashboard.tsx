import { ClickableTile, Column, Grid, Tag, Tile } from "@carbon/react";
import { Building } from "@carbon/pictograms-react";
import { formatINRShort } from "@esti/contracts";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

function Kpi({
  label,
  value,
  helper,
  onClick,
  tag,
}: {
  label: string;
  value: string;
  helper?: string;
  onClick?: () => void;
  tag?: { type: "red" | "magenta" | "blue"; text: string };
}) {
  const body = (
    <>
      <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{value}</p>
      {helper && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{helper}</p>}
      {tag && (
        <Tag type={tag.type} style={{ marginTop: 8 }}>
          {tag.text}
        </Tag>
      )}
    </>
  );
  return onClick ? (
    <ClickableTile onClick={onClick} style={{ height: "100%" }}>
      {body}
    </ClickableTile>
  ) : (
    <Tile style={{ height: "100%" }}>{body}</Tile>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Building width={48} height={48} />
        <div>
          <h1>Office dashboard</h1>
          <p style={{ color: "var(--cds-text-secondary)" }}>
            Architectural Office Resource Management System
          </p>
        </div>
      </div>

      <Grid narrow style={{ rowGap: "1rem", marginTop: 16 }}>
        <Column sm={4} md={4} lg={4}>
          <Kpi
            label="Projects"
            value={String(s?.projects.total ?? "…")}
            helper={`${active} active · ${enquiry} enquiry · ${completed} done`}
            onClick={() => navigate("/projects")}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Kpi
            label="Contract value"
            value={s ? formatINRShort(s.projects.contractValuePaise) : "…"}
            helper="Across all project offices"
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Kpi
            label="Outstanding (net of TDS)"
            value={s ? formatINRShort(s.invoices.outstandingPaise) : "…"}
            helper={s ? `${formatINRShort(s.invoices.collectedPaise)} collected` : undefined}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Kpi
            label="Invoiced"
            value={s ? formatINRShort(s.invoices.invoicedPaise) : "…"}
            helper="Issued + paid, gross"
          />
        </Column>

        <Column sm={4} md={8} lg={16}>
          <h3 style={{ marginTop: 16 }}>Compliance &amp; alerts</h3>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Kpi
            label="Permits"
            value={String(s?.permits.open ?? "…")}
            helper={`open of ${s?.permits.total ?? 0} total`}
            tag={s?.permits.overdue ? { type: "red", text: `${s.permits.overdue} overdue` } : undefined}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Kpi
            label="Fee proposals"
            value={String(s?.feeProposals.total ?? "…")}
            tag={
              s?.feeProposals.belowMinimum
                ? { type: "magenta", text: `${s.feeProposals.belowMinimum} below COA min` }
                : undefined
            }
          />
        </Column>

        {s?.hr && (
          <>
            <Column sm={4} md={8} lg={16}>
              <h3 style={{ marginTop: 16 }}>Team &amp; HR</h3>
            </Column>
            <Column sm={4} md={4} lg={4}>
              <Kpi label="Headcount" value={String(s.hr.headcount)} helper="active staff" onClick={() => navigate("/team")} />
            </Column>
            <Column sm={4} md={4} lg={4}>
              <Kpi
                label="Pending leaves"
                value={String(s.hr.pendingLeaves)}
                onClick={() => navigate("/hr")}
                tag={s.hr.pendingLeaves ? { type: "blue", text: "awaiting approval" } : undefined}
              />
            </Column>
            <Column sm={4} md={4} lg={4}>
              <Kpi
                label="Unpaid payslips"
                value={String(s.hr.unpaidPayslips)}
                helper={`${formatINRShort(s.hr.unpaidNetPaise)} due`}
                onClick={() => navigate("/hr")}
              />
            </Column>
          </>
        )}
      </Grid>
    </div>
  );
}
