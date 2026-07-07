import {
  Alert,
  AlertTitle,
  Box,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { PROGRAM_SPACE_CATEGORY_LABEL, formatINR } from "@esti/contracts";
import { StatusDot } from "./StatusTag.js";
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
 * the site never edits them here — it reads the agreed baseline. Material UI.
 */
export function ProjectSiteReference({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const q = trpc.program.siteReference.useQuery({ projectId });
  const data = q.data;

  if (q.isLoading) return <p className="esti-label--secondary">Loading reference…</p>;
  if (!data || (!data.assessment && !data.program)) {
    return (
      <Stack spacing={1}>
        {!compact && <Typography variant="h6" component="h4">Program & feasibility</Typography>}
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
    <Stack spacing={3}>
      {!compact && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h6" component="h4">Program & feasibility</Typography>
          {p && <StatusDot color="green" label={`Program v${p.version} · frozen`} />}
        </Box>
      )}

      <Alert severity="info">
        <AlertTitle>Source of truth</AlertTitle>
        The feasibility envelope and frozen program are the agreed baseline for site delivery.
        This view is read-only — changes are made upstream in the project Pipeline and Program tabs.
      </Alert>

      {/* Feasibility envelope */}
      {a && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" component="h5">Feasibility envelope</Typography>
          <Grid container spacing={1}>
            {[
              { label: "Site area", value: `${area(a.siteAreaSqm)} sqm` },
              { label: "Permissible FAR area", value: `${area(a.permissibleFarArea)} sqm` },
              { label: "Max built extent", value: `${area(a.superBuiltupArea)} sqm` },
              { label: "Possible floors", value: area(a.possibleFloors) },
              { label: "Ground coverage", value: `${area(a.actualGroundCoverage)} sqm` },
              { label: "Est. project cost", value: formatINR(a.estimatedProjectCostPaise, { paise: false }) },
            ].map((k) => (
              <Grid key={k.label} size={{ xs: 6, md: 4 }}>
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <p className="esti-label--secondary">{k.label}</p>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 0.5 }}>{k.value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}

      {/* Frozen program */}
      {p ? (
        <Stack spacing={1}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" component="h5">Frozen program (v{p.version})</Typography>
            <StatusDot color="gray" label={`${area(p.totalProgrammedAreaSqm)} sqm · ${p.floorsUsed} floors`} />
            {p.overEnvelope && <StatusDot color="red" label="Over envelope" />}
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Space</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Floor</TableCell>
                <TableCell>Count</TableCell>
                <TableCell>Area</TableCell>
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
