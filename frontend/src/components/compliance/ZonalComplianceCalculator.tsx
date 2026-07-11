import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import CalculateIcon from "@mui/icons-material/Calculate";
import {
  HOSAPETE_BUILDING_LINE_KEYS,
  HOSAPETE_BUILDING_TYPES,
  HOSAPETE_BUILDING_TYPE_KEYS,
  ZONAL_CITIES,
  ZONAL_ZONES,
  computeZonalCompliance,
  type ZonalCityId,
  type ZonalComplianceReport,
  type ZonalZone,
} from "@esti/contracts";
import { StatusDot } from "../StatusTag.js";

const DEFAULT_CITY: ZonalCityId = "hosapete";

const EMPTY: {
  cityId: ZonalCityId;
  zone: ZonalZone;
  buildingType: (typeof HOSAPETE_BUILDING_TYPE_KEYS)[number];
  widthM: number;
  depthM: number;
  plotAreaSqm: number | "";
  roadFrontM: number;
  roadRearM: number;
  roadLeftM: number;
  roadRightM: number;
  roadClass: (typeof HOSAPETE_BUILDING_LINE_KEYS)[number];
  tenements: number;
  parkingQty: number;
} = {
  cityId: DEFAULT_CITY,
  zone: "Residential" as ZonalZone,
  buildingType: HOSAPETE_BUILDING_TYPE_KEYS[0]!,
  widthM: 15,
  depthM: 20,
  plotAreaSqm: "" as number | "",
  roadFrontM: 12,
  roadRearM: 0,
  roadLeftM: 0,
  roadRightM: 0,
  roadClass: HOSAPETE_BUILDING_LINE_KEYS[HOSAPETE_BUILDING_LINE_KEYS.length - 1]!,
  tenements: 1,
  parkingQty: 0,
};

function SiteDiagram({
  width,
  depth,
  front,
  rear,
  left,
  right,
  buildW,
  buildD,
  envelope,
}: {
  width: number;
  depth: number;
  front: number;
  rear: number;
  left: number;
  right: number;
  buildW: number;
  buildD: number;
  envelope: number;
}) {
  const vbW = 320;
  const vbH = 200;
  const margin = 36;
  const scale = Math.min((vbW - 2 * margin) / width, (vbH - 2 * margin) / depth);
  const pw = width * scale;
  const pd = depth * scale;
  const x0 = (vbW - pw) / 2;
  const y0 = (vbH - pd) / 2;
  const bx0 = x0 + left * scale;
  const by0 = y0 + front * scale;
  const bx1 = x0 + pw - right * scale;
  const by1 = y0 + pd - rear * scale;
  const hasBuild = bx1 > bx0 && by1 > by0;

  return (
    <Box sx={{ width: 1, maxWidth: 420, mx: "auto" }}>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" aria-label="Site setback diagram">
        <rect x={x0} y={y0} width={pw} height={pd} fill="#EDEFF4" stroke="#334155" strokeWidth={1.5} />
        {hasBuild && (
          <>
            <rect x={bx0} y={by0} width={bx1 - bx0} height={by1 - by0} fill="#CDE8CC" stroke="#4C8C4A" strokeWidth={1.5} />
            <rect
              x={bx0}
              y={by0}
              width={bx1 - bx0}
              height={by1 - by0}
              fill="none"
              stroke="#D9534F"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text x={(bx0 + bx1) / 2} y={(by0 + by1) / 2 - 4} textAnchor="middle" fontSize={9} fill="#0B2447" fontWeight={600}>
              Buildable area
            </text>
            <text x={(bx0 + bx1) / 2} y={(by0 + by1) / 2 + 8} textAnchor="middle" fontSize={8} fill="#0B2447">
              {buildW.toFixed(2)} m × {buildD.toFixed(2)} m
            </text>
            <text x={(bx0 + bx1) / 2} y={(by0 + by1) / 2 + 20} textAnchor="middle" fontSize={7} fill="#5A6B85">
              = {envelope.toFixed(2)} sqm
            </text>
          </>
        )}
        <text x={(x0 + x0 + pw) / 2} y={y0 - 10} textAnchor="middle" fontSize={8} fill="#0B2447">
          Front {front.toFixed(2)} m
        </text>
        <text x={(x0 + x0 + pw) / 2} y={y0 + pd + 16} textAnchor="middle" fontSize={8} fill="#0B2447">
          Rear {rear.toFixed(2)} m
        </text>
        <text x={x0 - 8} y={(y0 + y0 + pd) / 2} textAnchor="end" fontSize={8} fill="#0B2447">
          L {left.toFixed(2)}
        </text>
        <text x={x0 + pw + 8} y={(y0 + y0 + pd) / 2} textAnchor="start" fontSize={8} fill="#0B2447">
          R {right.toFixed(2)}
        </text>
      </svg>
    </Box>
  );
}

const setbackCols: GridColDef[] = [
  { field: "side", headerName: "Side", flex: 1 },
  { field: "roadWidthM", headerName: "Road (m)", width: 100 },
  { field: "setbackM", headerName: "Setback (m)", width: 110 },
];

/**
 * Municipal zonal-regulations calculator — ported from `docs/reference/zonal-compliance/`
 * (Hosapete live; other Karnataka / Pune authorities catalogued for reference).
 */
export function ZonalComplianceCalculator() {
  const [form, setForm] = useState(EMPTY);
  const [report, setReport] = useState<ZonalComplianceReport | null>(null);

  const cityMeta = useMemo(() => ZONAL_CITIES.find((c) => c.id === form.cityId), [form.cityId]);
  const buildingMeta = HOSAPETE_BUILDING_TYPES[form.buildingType];

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const calc = () => {
    setReport(
      computeZonalCompliance({
        cityId: form.cityId,
        zone: form.zone,
        buildingType: form.buildingType,
        widthM: form.widthM,
        depthM: form.depthM,
        plotAreaSqm: form.plotAreaSqm === "" ? undefined : Number(form.plotAreaSqm),
        roadFrontM: form.roadFrontM,
        roadRearM: form.roadRearM,
        roadLeftM: form.roadLeftM,
        roadRightM: form.roadRightM,
        roadClass: form.roadClass,
        tenements: form.tenements,
        parkingQty: form.parkingQty,
      }),
    );
  };

  const showHosapeteFields = form.cityId === "hosapete";

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h6" component="h3">Zonal compliance calculator</Typography>
        <p className="esti-label esti-label--secondary">
          Building-parameter engine from the zonal compliance library — setbacks, restricted building line,
          FAR, ground coverage, corridor width and parking. Hosapete (Hospet LPA Master Plan Rev-1) is
          live; other cities in the library are listed for reference while their rule sets are wired in.
        </p>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Stack spacing={2}>
            <TextField
              select
              label="Planning authority / city"
              value={form.cityId}
              onChange={(e) => {
                const cityId = e.target.value as ZonalCityId;
                set("cityId", cityId);
                setReport(null);
              }}
              fullWidth
            >
              {ZONAL_CITIES.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.label}{c.calculatorReady ? "" : " (reference)"}
                </MenuItem>
              ))}
            </TextField>

            {cityMeta && (
              <Alert severity={cityMeta.calculatorReady ? "info" : "warning"}>
                <strong>{cityMeta.source}</strong>
                {!cityMeta.calculatorReady && (
                  <> — reference data in <code>docs/reference/zonal-compliance/Cities/{cityMeta.referenceFile}</code></>
                )}
              </Alert>
            )}

            {showHosapeteFields && (
              <>
                <TextField select label="Zone" value={form.zone} onChange={(e) => set("zone", e.target.value as ZonalZone)} fullWidth>
                  {ZONAL_ZONES.map((z) => (
                    <MenuItem key={z} value={z}>{z}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Building / use type"
                  value={form.buildingType}
                  onChange={(e) => set("buildingType", e.target.value)}
                  fullWidth
                >
                  {HOSAPETE_BUILDING_TYPE_KEYS.map((k) => (
                    <MenuItem key={k} value={k}>{k}</MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Frontage / width (m)"
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    value={form.widthM}
                    onChange={(e) => set("widthM", Number(e.target.value))}
                    fullWidth
                  />
                  <TextField
                    label="Depth (m)"
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    value={form.depthM}
                    onChange={(e) => set("depthM", Number(e.target.value))}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Plot area (sqm) — blank = W × D"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  value={form.plotAreaSqm}
                  onChange={(e) => set("plotAreaSqm", e.target.value === "" ? "" : Number(e.target.value))}
                  fullWidth
                />
                <Typography variant="overline" color="text.secondary">Abutting road widths (m)</Typography>
                <Grid container spacing={1}>
                  {(
                    [
                      ["roadFrontM", "Front"],
                      ["roadRearM", "Rear"],
                      ["roadLeftM", "Left"],
                      ["roadRightM", "Right"],
                    ] as const
                  ).map(([key, label]) => (
                    <Grid key={key} size={{ xs: 6 }}>
                      <TextField
                        label={label}
                        type="number"
                        size="small"
                        slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                        value={form[key]}
                        onChange={(e) => set(key, Number(e.target.value))}
                        fullWidth
                      />
                    </Grid>
                  ))}
                </Grid>
                <TextField
                  select
                  label="Road class (Table 18 building line)"
                  value={form.roadClass}
                  onChange={(e) => set("roadClass", e.target.value)}
                  fullWidth
                >
                  {HOSAPETE_BUILDING_LINE_KEYS.map((k) => (
                    <MenuItem key={k} value={k}>{k}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Tenements / units"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  value={form.tenements}
                  onChange={(e) => set("tenements", Number(e.target.value))}
                  fullWidth
                  disabled={!buildingMeta?.tenement}
                />
                <TextField
                  label={buildingMeta?.qtyLabel ?? "Parking basis value"}
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  value={form.parkingQty}
                  onChange={(e) => set("parkingQty", Number(e.target.value))}
                  fullWidth
                  disabled={!buildingMeta?.qtyLabel}
                />
              </>
            )}

            <Button variant="contained" startIcon={<CalculateIcon />} onClick={calc}>
              Calculate
            </Button>

            <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
              Reference / planning aid only. Verify all values against the authoritative zonal
              regulations before statutory approval.
            </Alert>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          {!report && (
            <Box className="esti-fill" sx={{ p: 2 }}>
              <p className="esti-label esti-label--secondary">
                Select a planning authority, enter site parameters, then Calculate.
              </p>
            </Box>
          )}
          {report && !report.ok && (
            <Alert severity="error">{report.error}</Alert>
          )}
          {report && report.ok && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                <StatusDot color="blue" label={report.city.label} />
                <StatusDot color="cool-gray" label={`${report.plotAreaSqm.toFixed(0)} sqm`} />
                <StatusDot color="purple" label={`FAR ${report.permissibleFar.toFixed(2)}`} />
                <StatusDot color="green" label={`Coverage ${report.groundCoveragePct.toFixed(0)}%`} />
              </Stack>

              <Grid container spacing={2}>
                {[
                  { label: "Max built-up", value: `${report.maxBuiltUpSqm.toLocaleString("en-IN", { maximumFractionDigits: 2 })} sqm` },
                  { label: "Max ground coverage", value: `${report.maxGroundCoverageSqm.toLocaleString("en-IN", { maximumFractionDigits: 2 })} sqm` },
                  { label: "Car parking", value: `${report.carSpaces} (+ ${report.twoWheelerSpaces} two-wheeler)` },
                  { label: "Corridor min.", value: `${report.corridorWidthM.toFixed(2)} m` },
                ].map((k) => (
                  <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{k.value}</Typography>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" component="h4">Site diagram</Typography>
              <SiteDiagram
                width={form.widthM}
                depth={form.depthM}
                front={report.frontSetbackM}
                rear={report.rearM}
                left={report.leftM}
                right={report.rightM}
                buildW={report.buildableWidthM}
                buildD={report.buildableDepthM}
                envelope={report.buildableEnvelopeSqm}
              />

              <Typography variant="subtitle2" component="h4">Setbacks (Table 1)</Typography>
              <DataGrid
                rows={report.setbacks.map((r, i) => ({ ...r, id: i }))}
                columns={setbackCols}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" component="h4">FAR &amp; coverage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Determining road: {report.determiningRoadM.toFixed(2)} m · Bands: front/rear {report.bandLabels.frontRear}, sides {report.bandLabels.sides}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" component="h4">Building line (Table 18)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {report.buildingLineFromCentreM == null
                      ? `Front setback ${report.frontSetbackM.toFixed(2)} m (Table 1)`
                      : `From road centre ${report.buildingLineFromCentreM.toFixed(2)} m → boundary ${report.buildingLineFromBoundaryM?.toFixed(2) ?? "—"} m · effective front ${report.frontSetbackM.toFixed(2)} m`}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" component="h4">Parking (Table 11)</Typography>
              <Typography variant="body2">{report.parkingBasis}</Typography>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Stack>
  );
}
