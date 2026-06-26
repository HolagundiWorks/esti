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
import { PROGRAM_SPACE_CATEGORY_LABEL, formatINR } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

function area(n: number | null | undefined): string {
  if (n == null) return "—";
  return (Number.isInteger(n) ? n : Number(n.toFixed(2))).toLocaleString("en-IN");
}
function floorLabel(level: number): string {
  if (level === 0) return "Ground";
  if (level < 0) return `Basement ${Math.abs(level)}`;
  return `Floor ${level}`;
}

/**
 * Read-only "Program & feasibility" reference for site delivery. Feasibility (max
 * built extent) and the frozen program are the single source of truth upstream;
 * the site never edits them here — it reads the agreed baseline.
 */
export function ProjectSiteReference({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const q = trpc.program.siteReference.useQuery({ projectId });
  const data = q.data;

  if (q.isLoading) return <p className="esti-label--secondary">Loading reference…</p>;
  if (!data || (!data.assessment && !data.program)) {
    return (
      <Stack gap={3}>
        {!compact && <h4 style={{ margin: 0 }}>Program & feasibility</h4>}
        <p className="esti-label--secondary">
          No feasibility assessment or frozen program yet. Once the feasibility is recorded
          and the program is frozen, the agreed baseline appears here as the site reference.
        </p>
      </Stack>
    );
  }

  const a = data.assessment;
  const p = data.program;

  return (
    <Stack gap={6}>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
          <h4 style={{ margin: 0 }}>Program & feasibility</h4>
          {p && <Tag type="green" size="sm">Program v{p.version} · frozen</Tag>}
        </div>
      )}

      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title="Source of truth"
        subtitle="The feasibility envelope and frozen program are the agreed baseline for site delivery. This view is read-only — changes are made upstream in the project Pipeline and Program tabs."
      />

      {/* Feasibility envelope */}
      {a && (
        <Stack gap={3}>
          <h5 style={{ margin: 0 }}>Feasibility envelope</h5>
          <Grid condensed>
            {[
              { label: "Site area", value: `${area(a.siteAreaSqm)} sqm` },
              { label: "Permissible FAR area", value: `${area(a.permissibleFarArea)} sqm` },
              { label: "Max built extent", value: `${area(a.superBuiltupArea)} sqm` },
              { label: "Possible floors", value: area(a.possibleFloors) },
              { label: "Ground coverage", value: `${area(a.actualGroundCoverage)} sqm` },
              { label: "Est. project cost", value: formatINR(a.estimatedProjectCostPaise, { paise: false }) },
            ].map((k) => (
              <Column key={k.label} sm={2} md={4} lg={4}>
                <Tile style={{ padding: "var(--cds-spacing-04)" }}>
                  <p className="esti-label--secondary">{k.label}</p>
                  <p style={{ fontSize: "1.125rem", fontWeight: 600, marginTop: "var(--cds-spacing-02)" }}>{k.value}</p>
                </Tile>
              </Column>
            ))}
          </Grid>
        </Stack>
      )}

      {/* Frozen program */}
      {p ? (
        <Stack gap={3}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
            <h5 style={{ margin: 0 }}>Frozen program (v{p.version})</h5>
            <Tag type="gray" size="sm">{area(p.totalProgrammedAreaSqm)} sqm · {p.floorsUsed} floors</Tag>
            {p.overEnvelope && <Tag type="red" size="sm">Over envelope</Tag>}
          </div>
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Space</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Floor</TableHeader>
                  <TableHeader>Count</TableHeader>
                  <TableHeader>Area</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {p.spaces.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{PROGRAM_SPACE_CATEGORY_LABEL[s.category as keyof typeof PROGRAM_SPACE_CATEGORY_LABEL] ?? s.category}</TableCell>
                    <TableCell>{floorLabel(s.floorLevel)}</TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell>{area(s.areaSqm)} sqm</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      ) : (
        <p className="esti-label--secondary">
          No frozen program yet — freeze a program version in the Program tab to publish the
          agreed space schedule to the site.
        </p>
      )}
    </Stack>
  );
}
