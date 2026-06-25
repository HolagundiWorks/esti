import "@carbon/charts-react/styles.css";
import {
  Column,
  Grid,
  InlineNotification,
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
import { MeterChart } from "@carbon/charts-react";
import {
  COST_STATUS_LABEL,
  COST_STATUS_TAG,
  type CostRiskSeverity,
  type CostStatus,
  costStatusFor,
  formatINR,
  formatINRShort,
} from "@esti/contracts";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";

/** HIGH → error, MEDIUM → warning, LOW → info (Carbon InlineNotification kinds). */
const SEVERITY_KIND: Record<CostRiskSeverity, "error" | "warning" | "info"> = {
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "info",
};

const BUDGET_METER_HEIGHT = "24px";

/** One headline KPI: a caption over a money figure, no inline styling. */
function KpiTile({ label, paise }: { label: string; paise: number }) {
  return (
    <Tile className="esti-fill">
      <Stack gap={2}>
        <p className="esti-label--secondary">{label}</p>
        <h4>{formatINRShort(paise)}</h4>
      </Stack>
    </Tile>
  );
}

/**
 * Construction Cost OS Phase G — per-project cost-health panel. Reads the whole
 * spine back as one calm picture (KPIs, budget meter, package/contractor status)
 * plus the deterministic risk checks. Read-only; advisory — nothing here approves.
 */
export function ProjectCostDashboard({ projectId }: { projectId: string }) {
  const chartTheme = useAppTheme();
  const healthQ = trpc.dashboard.constructionCost.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const data = healthQ.data;

  if (healthQ.isLoading || !data) {
    return (
      <DataState loading isEmpty={false} empty={{ title: "" }} columnCount={6}>
        {null}
      </DataState>
    );
  }

  const { kpis, overrunPct, packages, contractors, riskNotes, generatedAt } = data;

  const ceilingPaise = kpis.awardedPaise + kpis.variationValuePaise;
  const budgetUsedPct =
    ceilingPaise > 0 ? Math.min(100, (kpis.billedGrossPaise / ceilingPaise) * 100) : 0;

  // Project-level Green/Amber/Red/Grey, derived from the same helper the packages use.
  const overallStatus: CostStatus = costStatusFor({
    contractPaise: kpis.awardedPaise,
    variationPaise: kpis.variationValuePaise,
    billedPaise: kpis.billedGrossPaise,
    openDeviations: kpis.unapprovedDeviations.count,
    started: kpis.awardedPaise > 0,
  });

  const overrunText =
    overrunPct === null
      ? "No estimate baseline yet"
      : `${overrunPct >= 0 ? "+" : ""}${overrunPct.toFixed(1)}% vs estimate`;

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <h4>Cost dashboard</h4>
        <p className="esti-label--secondary">
          The whole delivery spine rolled into one cost-health view — estimated through
          certified, with package- and contractor-wise status. As of{" "}
          {new Date(generatedAt).toLocaleString("en-IN")}.
        </p>
      </Stack>

      {/* KPI band */}
      <Grid narrow condensed>
        <Column sm={2} md={2} lg={3}>
          <KpiTile label="Estimated" paise={kpis.estimatedPaise} />
        </Column>
        <Column sm={2} md={2} lg={3}>
          <KpiTile label="Tendered" paise={kpis.tenderedPaise} />
        </Column>
        <Column sm={2} md={2} lg={3}>
          <KpiTile label="Awarded" paise={kpis.awardedPaise} />
        </Column>
        <Column sm={2} md={3} lg={3}>
          <KpiTile label="Billed (gross)" paise={kpis.billedGrossPaise} />
        </Column>
        <Column sm={2} md={3} lg={4}>
          <KpiTile label="Certified (net payable)" paise={kpis.certifiedNetPaise} />
        </Column>
      </Grid>

      {/* Budget meter + overall status */}
      <Tile>
        <Stack gap={4}>
          <Stack orientation="horizontal" gap={3} style={{ alignItems: "center", flexWrap: "wrap" }}>
            <Tag type={COST_STATUS_TAG[overallStatus]} size="sm">
              {COST_STATUS_LABEL[overallStatus]}
            </Tag>
            <span className="esti-label--secondary">{overrunText}</span>
          </Stack>
          <div className="esti-chart-sm">
            <MeterChart
              data={[{ group: "Billed", value: budgetUsedPct }]}
              options={{
                data: { groupMapsTo: "group" },
                height: BUDGET_METER_HEIGHT,
                theme: chartTheme,
                toolbar: { enabled: false },
                legend: { enabled: false },
                meter: { peak: 100 },
                accessibility: {
                  svgAriaLabel: `Budget used ${budgetUsedPct.toFixed(0)} percent`,
                },
              }}
            />
          </div>
          <p className="esti-label--secondary">
            {formatINR(kpis.billedGrossPaise, { paise: false })} billed of{" "}
            {formatINR(ceilingPaise, { paise: false })} awarded (incl. approved variations).
          </p>
        </Stack>
      </Tile>

      {/* Deviations, variations, pending bills */}
      <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
        <Tag type="green" size="sm">
          Approved deviations: {kpis.approvedDeviations.count} ·{" "}
          {formatINR(kpis.approvedDeviations.valuePaise, { paise: false })}
        </Tag>
        <Tag type={kpis.unapprovedDeviations.count > 0 ? "red" : "gray"} size="sm">
          Unapproved deviations: {kpis.unapprovedDeviations.count} ·{" "}
          {formatINR(kpis.unapprovedDeviations.valuePaise, { paise: false })}
        </Tag>
        <Tag type="purple" size="sm">
          Variation value: {formatINR(kpis.variationValuePaise, { paise: false })}
        </Tag>
        <Tag type={kpis.pendingBillsCount > 0 ? "magenta" : "gray"} size="sm">
          Pending bills: {kpis.pendingBillsCount} ·{" "}
          {formatINR(kpis.pendingBillsPaise, { paise: false })}
        </Tag>
      </Stack>

      {/* Package-wise status */}
      <DataState
        loading={false}
        isEmpty={packages.length === 0}
        columnCount={7}
        empty={{
          title: "No work packages yet",
          description:
            "Award a tender into a work package to see package-wise cost status here.",
        }}
      >
        <TableContainer
          title="Package-wise status"
          description="Awarded value plus approved variations, against gross billed — Green within budget, Amber approaching, Red over or with an open deviation."
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Package</TableHeader>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Awarded</TableHeader>
                <TableHeader>Variations</TableHeader>
                <TableHeader>Billed</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.ref}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.contractor ?? "—"}</TableCell>
                  <TableCell>{formatINR(p.awardedPaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(p.variationPaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(p.billedPaise, { paise: false })}</TableCell>
                  <TableCell>
                    <Tag type={COST_STATUS_TAG[p.status]} size="sm">
                      {COST_STATUS_LABEL[p.status]}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* Contractor-wise roll-up */}
      {contractors.length > 0 && (
        <TableContainer
          title="Contractor-wise"
          description="Gross billed and certified-net per contractor across this project's running bills."
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Billed (gross)</TableHeader>
                <TableHeader>Certified (net)</TableHeader>
                <TableHeader>Pending bills</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{formatINR(c.billedPaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(c.certifiedPaise, { paise: false })}</TableCell>
                  <TableCell>{c.pendingBills}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Deterministic risk checks (the "checker") */}
      <Stack gap={3}>
        <Stack gap={1}>
          <h5>Automated cost checks</h5>
          <p className="esti-label--secondary">
            Advisory only — these are arithmetic checks over the spine; nothing is auto-approved.
          </p>
        </Stack>
        {riskNotes.length === 0 ? (
          <Tag type="green" size="sm">
            No cost risks detected
          </Tag>
        ) : (
          <Stack gap={2}>
            {riskNotes.map((n, i) => (
              <InlineNotification
                key={`${n.kind}-${i}`}
                kind={SEVERITY_KIND[n.severity]}
                lowContrast
                hideCloseButton
                title={n.label}
                subtitle={`${n.detail} (${n.ref})`}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
