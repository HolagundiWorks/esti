/**
 * Shared, presentational estimate views — the Abstract / BOQ / Materials / Steel
 * tables + the project Rate Book editor. Pure display of a `CostedEstimate`
 * (from recostEstimate); data fetching lives in useProjectEstimate. Reused by the
 * Cost Management tabs (Estimation · BOQ · BBS).
 */
import {
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import { formatINR, type CostedEstimate, type RateSource } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../../DataState.js";
import { trpc } from "../../../lib/trpc.js";

export type Costed = CostedEstimate;
export const inr = (paise: number) => formatINR(paise, { paise: false });
export const qty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
const scroll = { maxHeight: "58vh", overflowY: "auto" } as const;

// Preserve exact Carbon tag colours by rendering an MUI Chip over the
// `--cds-tag-*` token vars (still defined by the Carbon token layer).
const tagSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color}, var(--cds-layer-01))`,
  color: `var(--cds-tag-color-${color}, var(--cds-text-primary))`,
});

/** Variance tag — green when the rate book costs less than the estimate, red when more. */
export function VarianceTag({ paise }: { paise: number }) {
  if (paise === 0) return <Chip label="±0" size="small" sx={tagSx("gray")} />;
  return (
    <Chip
      label={`${paise < 0 ? "−" : "+"}${inr(Math.abs(paise))}`}
      size="small"
      sx={tagSx(paise < 0 ? "green" : "red")}
    />
  );
}

/** Where the costed rate came from — project override, office book, or estimate. */
export function SourceTag({ source }: { source: RateSource }) {
  if (source === "project") return <Chip label="project" size="small" sx={tagSx("purple")} />;
  if (source === "estimate") return <Chip label="est." size="small" sx={tagSx("cool-gray")} />;
  return null; // rateBook is the norm — no tag
}

/** Summary chips: as-estimated vs costed + variance. */
export function EstimateSummary({ c }: { c: Costed }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Chip label={`Estimate ${inr(c.abstract.totalEstimatedPaise)}`} sx={tagSx("blue")} />
      <Chip label={`Costed ${inr(c.grandTotalPaise)}`} sx={tagSx("teal")} />
      <VarianceTag paise={c.abstract.totalVariancePaise} />
    </Stack>
  );
}

/** Shown by BOQ/BBS when no estimate is selected in the Estimation tab. */
export function NoEstimate({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <Stack spacing={0.5}>
        {Array.from({ length: 4 }).map((_, row) => (
          <Stack key={row} direction="row" spacing={1}>
            {Array.from({ length: 6 }).map((__, col) => (
              <Skeleton key={col} variant="rectangular" height={32} sx={{ flex: 1 }} />
            ))}
          </Stack>
        ))}
      </Stack>
    );
  }
  return (
    <span className="esti-label esti-label--helper">
      No estimate yet — import an <code>.aormsest</code> file in the Estimation tab.
    </span>
  );
}

/** Rate + source tag rendered together in one grid cell. */
function RateWithSource({ paise, source }: { paise: number; source: RateSource }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 1 }}>
      <span>{inr(paise)}</span>
      <SourceTag source={source} />
    </Box>
  );
}

export function AbstractTab({ c }: { c: Costed }) {
  const rows = c.abstract.rows;
  const columns: GridColDef[] = [
    { field: "code", headerName: "Code", flex: 0.6, minWidth: 90 },
    { field: "shortName", headerName: "Item", flex: 1.4, minWidth: 160 },
    { field: "uom", headerName: "Unit", flex: 0.4, minWidth: 70 },
    { field: "qty", headerName: "Qty", flex: 0.6, minWidth: 90, renderCell: (p) => qty(p.row.qty) },
    {
      field: "ratePaiseEstimated",
      headerName: "Rate (est.)",
      flex: 0.7,
      minWidth: 100,
      renderCell: (p) => inr(p.row.ratePaiseEstimated),
    },
    {
      field: "ratePaise",
      headerName: "Rate",
      flex: 0.9,
      minWidth: 120,
      renderCell: (p) => <RateWithSource paise={p.row.ratePaise} source={p.row.rateSource} />,
    },
    {
      field: "leadAmountPaise",
      headerName: "Lead",
      flex: 0.6,
      minWidth: 90,
      renderCell: (p) => (p.row.leadAmountPaise ? inr(p.row.leadAmountPaise) : "—"),
    },
    {
      field: "amountPaise",
      headerName: "Amount",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => inr(p.row.amountPaise),
    },
    {
      field: "variancePaise",
      headerName: "Variance",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => <VarianceTag paise={p.row.variancePaise} />,
    },
  ];
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={9} empty={{ title: "No items" }}>
      <Stack spacing={1}>
        <div>
          <Typography variant="subtitle1" component="h4">Abstract of cost</Typography>
          <Typography variant="caption" color="text.secondary">
            {`As-estimated ${inr(c.abstract.totalEstimatedPaise)} · costed ${inr(c.abstract.totalCostedPaise)}${
              c.abstract.totalLeadPaise ? ` · lead ${inr(c.abstract.totalLeadPaise)}` : ""
            }`}
          </Typography>
        </div>
        <Box sx={scroll}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.code}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Box>
      </Stack>
    </DataState>
  );
}

export function BoqTab({ c }: { c: Costed }) {
  const columns: GridColDef[] = [
    { field: "code", headerName: "Code", flex: 0.6, minWidth: 90 },
    { field: "shortName", headerName: "Description", flex: 1.6, minWidth: 180 },
    { field: "uom", headerName: "Unit", flex: 0.4, minWidth: 70 },
    { field: "qty", headerName: "Qty", flex: 0.6, minWidth: 90, renderCell: (p) => qty(p.row.qty) },
    { field: "ratePaise", headerName: "Rate", flex: 0.7, minWidth: 100, renderCell: (p) => inr(p.row.ratePaise) },
    { field: "amountPaise", headerName: "Amount", flex: 0.8, minWidth: 110, renderCell: (p) => inr(p.row.amountPaise) },
  ];
  return (
    <DataState loading={false} isEmpty={c.boq.sections.length === 0} columnCount={6} empty={{ title: "No items" }}>
      <Stack spacing={2}>
        {c.boq.sections.map((sec) => (
          <Stack key={sec.section} spacing={1}>
            <div>
              <Typography variant="subtitle1" component="h4">{sec.section}</Typography>
              <Typography variant="caption" color="text.secondary">
                {`Subtotal ${inr(sec.subtotalPaise)}`}
              </Typography>
            </div>
            <DataGrid
              rows={sec.rows}
              columns={columns}
              getRowId={(row) => row.code}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />
          </Stack>
        ))}
      </Stack>
    </DataState>
  );
}

export function MaterialsTab({ c }: { c: Costed }) {
  const rows = c.materials.rows;
  const columns: GridColDef[] = [
    { field: "code", headerName: "Code", flex: 0.6, minWidth: 90 },
    { field: "name", headerName: "Material", flex: 1.6, minWidth: 180 },
    { field: "unit", headerName: "Unit", flex: 0.4, minWidth: 70 },
    { field: "qty", headerName: "Qty", flex: 0.6, minWidth: 90, renderCell: (p) => qty(p.row.qty) },
    {
      field: "ratePaise",
      headerName: "Rate",
      flex: 0.9,
      minWidth: 120,
      renderCell: (p) => <RateWithSource paise={p.row.ratePaise} source={p.row.rateSource} />,
    },
    { field: "amountPaise", headerName: "Value", flex: 0.8, minWidth: 110, renderCell: (p) => inr(p.row.amountPaise) },
  ];
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={6} empty={{ title: "No material take-off" }}>
      <Stack spacing={1}>
        <div>
          <Typography variant="subtitle1" component="h4">Material take-off</Typography>
          <Typography variant="caption" color="text.secondary">
            {`Procurement value ${inr(c.materials.totalPaise)}`}
          </Typography>
        </div>
        <Box sx={scroll}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.code}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Box>
      </Stack>
    </DataState>
  );
}

/** Steel reinforcement — the BBS roll-up by diameter. */
export function SteelTab({ c }: { c: Costed }) {
  const rows = c.steel.rows;
  const columns: GridColDef[] = [
    { field: "diaMm", headerName: "Ø (mm)", flex: 0.5, minWidth: 80 },
    { field: "unitWeightKgM", headerName: "Unit wt (kg/m)", flex: 0.7, minWidth: 120 },
    { field: "weightKg", headerName: "Weight (kg)", flex: 0.7, minWidth: 110, renderCell: (p) => qty(p.row.weightKg) },
    {
      field: "ratePaise",
      headerName: "Rate (₹/kg)",
      flex: 0.9,
      minWidth: 130,
      renderCell: (p) => <RateWithSource paise={p.row.ratePaise} source={p.row.rateSource} />,
    },
    { field: "amountPaise", headerName: "Value", flex: 0.8, minWidth: 110, renderCell: (p) => inr(p.row.amountPaise) },
  ];
  return (
    <DataState loading={false} isEmpty={rows.length === 0} columnCount={5} empty={{ title: "No reinforcement" }}>
      <Stack spacing={1}>
        <div>
          <Typography variant="subtitle1" component="h4">Bar Bending Schedule — steel by diameter</Typography>
          <Typography variant="caption" color="text.secondary">
            {`${qty(c.steel.totalWeightKg)} kg · value ${inr(c.steel.totalPaise)}`}
          </Typography>
        </div>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.diaMm}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </Stack>
    </DataState>
  );
}

/** The project rate book — a project's rate overrides that win over the office
 *  book when re-costing. Seed from the office book, then edit individual rates. */
export function ProjectRateBook({ projectId }: { projectId: string | null }) {
  const utils = trpc.useUtils();
  const rows = trpc.estimates.projectRates.useQuery({ projectId: projectId ?? "" }, { enabled: !!projectId });
  const invalidate = () => {
    void utils.estimates.projectRates.invalidate();
    void utils.estimates.recost.invalidate();
  };
  const seed = trpc.estimates.seedProjectRatesFromOffice.useMutation({ onSuccess: invalidate });
  const setRate = trpc.estimates.setProjectRate.useMutation({ onSuccess: invalidate });
  const remove = trpc.estimates.removeProjectRate.useMutation({ onSuccess: invalidate });

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [rupees, setRupees] = useState(0);

  if (!projectId) {
    return (
      <span className="esti-label esti-label--helper">
        Import an estimate under this project to keep a project rate book. Costing then prefers project rate → office rate →
        as-estimated.
      </span>
    );
  }

  function saveOverride() {
    if (!projectId || !code.trim()) return;
    setRate.mutate(
      { projectId, code: code.trim(), description: description.trim(), unit: unit.trim(), ratePaise: Math.round(rupees * 100) },
      { onSuccess: () => { setCode(""); setDescription(""); setUnit(""); setRupees(0); } },
    );
  }

  const list = rows.data ?? [];

  const columns: GridColDef[] = [
    { field: "code", headerName: "Code", flex: 0.7, minWidth: 100 },
    { field: "description", headerName: "Description", flex: 1.6, minWidth: 180 },
    { field: "unit", headerName: "Unit", flex: 0.4, minWidth: 70 },
    { field: "ratePaise", headerName: "Rate", flex: 0.7, minWidth: 100, renderCell: (p) => inr(p.row.ratePaise) },
    {
      field: "actions",
      headerName: "Remove",
      sortable: false,
      filterable: false,
      width: 90,
      renderCell: (p) => (
        <IconButton
          size="small"
          aria-label="Remove override"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: p.row.id })}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Button size="small" variant="outlined" disabled={seed.isPending} onClick={() => seed.mutate({ projectId })}>
          {seed.isPending ? "Seeding…" : "Seed from office rate book"}
        </Button>
        <span className="esti-label esti-label--helper">{list.length} project override(s)</span>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <TextField id="pr-code" size="small" label="Item code" value={code} onChange={(e) => setCode(e.target.value)} />
        <TextField id="pr-desc" size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField id="pr-unit" size="small" label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <TextField
          id="pr-rate"
          size="small"
          label="Rate (₹)"
          type="number"
          value={rupees}
          onChange={(e) => setRupees(Number(e.target.value) || 0)}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
        />
        <Button size="small" variant="contained" disabled={!code.trim() || setRate.isPending} onClick={saveOverride}>
          Save override
        </Button>
      </Stack>

      <DataState loading={rows.isLoading} isEmpty={list.length === 0} columnCount={5} empty={{ title: "No project overrides", description: "Seed from the office book or add an override above." }}>
        <Stack spacing={1}>
          <div>
            <Typography variant="subtitle1" component="h4">Project rate book</Typography>
            <Typography variant="caption" color="text.secondary">
              Overrides win over the office rate book when re-costing.
            </Typography>
          </div>
          <Box sx={scroll}>
            <DataGrid
              rows={list}
              columns={columns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />
          </Box>
        </Stack>
      </DataState>
    </Stack>
  );
}
