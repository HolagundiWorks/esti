import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import CalculateIcon from "@mui/icons-material/Calculate";
import { StatusDot } from "../StatusTag.js";
import {
  NBC_ZONES,
  computeNbcPermissible,
  type NbcPermissibleReport,
} from "@esti/contracts";

const EMPTY = { landUseCode: "R-1", siteAreaSqm: 1000, siteWidthM: 25, siteDepthM: 40, frontageM: 25 };

type ReportItem = { label: string; value: string | number; unit?: string; basis: string; ruleRef: string };

const reportColumns: GridColDef[] = [
  { field: "label", headerName: "Parameter", flex: 1 },
  {
    field: "value",
    headerName: "Value",
    flex: 1,
    renderCell: (params) => (
      <span>
        <strong>{(params.row as ReportItem).value}</strong> {(params.row as ReportItem).unit}
      </span>
    ),
  },
  { field: "basis", headerName: "Basis", flex: 2 },
  {
    field: "ruleRef",
    headerName: "Rule",
    flex: 1,
    renderCell: (params) => (
      <StatusDot color="gray" label={(params.row as ReportItem).ruleRef} />
    ),
  },
];

/**
 * NBC permissible-development calculator — a client-only feature module.
 * The engine (computeNbcPermissible) is pure and lives in @esti/contracts;
 * this is just its Material UI presentation. Derives the max development
 * envelope (FAR, coverage, setbacks, height/floors, parking) for a site
 * from its zone.
 */
export function ComplianceCalculator() {
  const [form, setForm] = useState(EMPTY);
  const [report, setReport] = useState<NbcPermissibleReport | null>(null);

  const set = (k: keyof typeof form, v: number | string) => setForm((f) => ({ ...f, [k]: v }));
  const calc = () => setReport(computeNbcPermissible(form));

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h6" component="h3">Permissible development calculator</Typography>
        <p className="esti-label esti-label--secondary">
          Derives the maximum permissible building envelope for a site from NBC-IND-2016
          development-control limits — FAR, ground coverage, setbacks, height/floors and parking.
          Authority limits are representative defaults; verify against the applicable municipal
          bye-laws before relying on a verdict.
        </p>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField
                id="cc-zone"
                select
                label="Land-use zone"
                value={form.landUseCode}
                onChange={(e) => set("landUseCode", e.target.value)}
                fullWidth
              >
                {NBC_ZONES.map((z) => (
                  <MenuItem key={z.code} value={z.code}>
                    {`${z.code} · ${z.category} — ${z.subCategory}`}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="cc-area"
                label="Site area (m²)"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 10 } }}
                value={form.siteAreaSqm}
                onChange={(e) => set("siteAreaSqm", Number(e.target.value))}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  id="cc-width"
                  label="Site width (m)"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  value={form.siteWidthM}
                  onChange={(e) => set("siteWidthM", Number(e.target.value))}
                  fullWidth
                />
                <TextField
                  id="cc-depth"
                  label="Site depth (m)"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  value={form.siteDepthM}
                  onChange={(e) => set("siteDepthM", Number(e.target.value))}
                  fullWidth
                />
              </Stack>
              <TextField
                id="cc-frontage"
                label="Road frontage (m)"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                value={form.frontageM}
                onChange={(e) => set("frontageM", Number(e.target.value))}
                fullWidth
              />
              <Button variant="contained" startIcon={<CalculateIcon />} onClick={calc}>
                Calculate
              </Button>
            </Stack>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          {!report && (
            <Box className="esti-fill" sx={{ p: 2 }}>
              <p className="esti-label esti-label--secondary">
                Enter the site parameters and choose a land-use zone, then Calculate.
              </p>
            </Box>
          )}
          {report && !report.ok && (
            <Alert severity="error">Cannot calculate — {report.error}</Alert>
          )}
          {report && report.ok && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} className="esti-row">
                <StatusDot color="blue" label={report.zoneLabel} />
                <StatusDot color="cool-gray" label={`${report.siteAreaSqm} m²`} />
                <Chip size="small" label={report.rulesVersion} variant="outlined" />
              </Stack>

              {Object.entries(report.groups).map(([group, items]) => (
                <Stack key={group} spacing={1}>
                  <Typography variant="subtitle2" component="h4">{group}</Typography>
                  <DataGrid
                    rows={items}
                    columns={reportColumns}
                    getRowId={(row) => (row as ReportItem).label}
                    density="compact"
                    disableRowSelectionOnClick
                    hideFooter
                    autoHeight
                    getRowHeight={() => "auto"}
                  />
                </Stack>
              ))}

              {report.notes.map((n, idx) => (
                <Alert key={idx} severity="info">{n}</Alert>
              ))}
            </Stack>
          )}
        </Grid>
      </Grid>
    </Stack>
  );
}
