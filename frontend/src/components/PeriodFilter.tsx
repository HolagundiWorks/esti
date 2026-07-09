import { MenuItem, Stack, TextField } from "@mui/material";
import type { PeriodFilterInput, PeriodPreset } from "@esti/contracts";
import { financialYear } from "@esti/contracts";

type Props = {
  value: PeriodFilterInput;
  onChange: (next: PeriodFilterInput) => void;
  /** `rail` — vertical stack, full-width fields for the 20% glass rail. */
  layout?: "inline" | "rail";
};

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "CURRENT_FY", label: "Current FY" },
  { id: "PREVIOUS_FY", label: "Previous FY" },
  { id: "QUARTER", label: "FY quarter" },
  { id: "MONTH", label: "Month" },
  { id: "ASSESSMENT_YEAR", label: "Assessment year (TDS)" },
  { id: "CUSTOM", label: "Custom range" },
];

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

export function PeriodFilter({ value, onChange, layout = "inline" }: Props) {
  const preset = value.preset ?? "CURRENT_FY";
  const currentFy = financialYear();
  const rail = layout === "rail";

  return (
    <Stack
      direction={rail ? "column" : "row"}
      spacing={rail ? 1 : 2}
      sx={{
        flexWrap: rail ? "nowrap" : "wrap",
        alignItems: rail ? "stretch" : "flex-end",
        rowGap: rail ? 0 : 2,
        minWidth: 0,
        width: 1,
      }}
    >
      <TextField
        id="period-preset"
        select
        label="Period"
        size="small"
        fullWidth={rail}
        value={preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value as PeriodPreset })}
        sx={rail ? undefined : { minWidth: 180 }}
      >
        {PRESETS.map((p) => (
          <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
        ))}
      </TextField>

      {(preset === "FY" || preset === "QUARTER") && (
        <TextField
          id="period-fy"
          select
          label="Financial year"
          size="small"
          fullWidth={rail}
          value={value.fy ?? currentFy}
          onChange={(e) => onChange({ ...value, fy: e.target.value })}
          sx={rail ? undefined : { minWidth: 140 }}
        >
          {[0, -1, -2].map((off) => {
            const y = Number(currentFy.slice(0, 4)) + off;
            const fy = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
            return <MenuItem key={fy} value={fy}>{`FY ${fy}`}</MenuItem>;
          })}
        </TextField>
      )}

      {preset === "QUARTER" && (
        <TextField
          id="period-q"
          select
          label="Quarter"
          size="small"
          fullWidth={rail}
          value={value.quarter ?? "Q1"}
          onChange={(e) => onChange({ ...value, quarter: e.target.value as PeriodFilterInput["quarter"] })}
          sx={rail ? undefined : { minWidth: 100 }}
        >
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
            <MenuItem key={q} value={q}>{q}</MenuItem>
          ))}
        </TextField>
      )}

      {preset === "MONTH" && (
        <TextField
          id="period-month"
          type="month"
          label="Month"
          size="small"
          fullWidth={rail}
          value={value.month ?? ""}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          {...shrink}
        />
      )}

      {preset === "ASSESSMENT_YEAR" && (
        <TextField
          id="period-ay"
          select
          label="Assessment year ending"
          size="small"
          fullWidth={rail}
          value={String(value.assessmentYear ?? new Date().getFullYear())}
          onChange={(e) => onChange({ ...value, assessmentYear: Number(e.target.value) })}
          sx={rail ? undefined : { minWidth: 180 }}
        >
          {[0, 1, 2].map((off) => {
            const y = new Date().getFullYear() + off;
            return <MenuItem key={y} value={String(y)}>{`Mar ${y}`}</MenuItem>;
          })}
        </TextField>
      )}

      {preset === "CUSTOM" && (
        <>
          <TextField
            id="period-from"
            type="date"
            label="From"
            size="small"
            fullWidth={rail}
            value={value.fromDate ?? ""}
            onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
            {...shrink}
          />
          <TextField
            id="period-to"
            type="date"
            label="To"
            size="small"
            fullWidth={rail}
            value={value.toDate ?? ""}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
            {...shrink}
          />
        </>
      )}
    </Stack>
  );
}
