import { Select, SelectItem, Stack, TextInput } from "@carbon/react";
import type { PeriodFilterInput, PeriodPreset } from "@esti/contracts";
import { financialYear } from "@esti/contracts";

type Props = {
  value: PeriodFilterInput;
  onChange: (next: PeriodFilterInput) => void;
};

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "CURRENT_FY", label: "Current FY" },
  { id: "PREVIOUS_FY", label: "Previous FY" },
  { id: "QUARTER", label: "FY quarter" },
  { id: "MONTH", label: "Month" },
  { id: "ASSESSMENT_YEAR", label: "Assessment year (TDS)" },
  { id: "CUSTOM", label: "Custom range" },
];

export function PeriodFilter({ value, onChange }: Props) {
  const preset = value.preset ?? "CURRENT_FY";
  const currentFy = financialYear();

  return (
    <Stack orientation="horizontal" gap={4} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <Select
        id="period-preset"
        labelText="Period"
        value={preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value as PeriodPreset })}
      >
        {PRESETS.map((p) => (
          <SelectItem key={p.id} value={p.id} text={p.label} />
        ))}
      </Select>

      {(preset === "FY" || preset === "QUARTER") && (
        <Select
          id="period-fy"
          labelText="Financial year"
          value={value.fy ?? currentFy}
          onChange={(e) => onChange({ ...value, fy: e.target.value })}
        >
          {[0, -1, -2].map((off) => {
            const y = Number(currentFy.slice(0, 4)) + off;
            const fy = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
            return <SelectItem key={fy} value={fy} text={`FY ${fy}`} />;
          })}
        </Select>
      )}

      {preset === "QUARTER" && (
        <Select
          id="period-q"
          labelText="Quarter"
          value={value.quarter ?? "Q1"}
          onChange={(e) => onChange({ ...value, quarter: e.target.value as PeriodFilterInput["quarter"] })}
        >
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
            <SelectItem key={q} value={q} text={q} />
          ))}
        </Select>
      )}

      {preset === "MONTH" && (
        <TextInput
          id="period-month"
          type="month"
          labelText="Month"
          value={value.month ?? ""}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
        />
      )}

      {preset === "ASSESSMENT_YEAR" && (
        <Select
          id="period-ay"
          labelText="Assessment year ending"
          value={String(value.assessmentYear ?? new Date().getFullYear())}
          onChange={(e) => onChange({ ...value, assessmentYear: Number(e.target.value) })}
        >
          {[0, 1, 2].map((off) => {
            const y = new Date().getFullYear() + off;
            return <SelectItem key={y} value={String(y)} text={`Mar ${y}`} />;
          })}
        </Select>
      )}

      {preset === "CUSTOM" && (
        <>
          <TextInput
            id="period-from"
            type="date"
            labelText="From"
            value={value.fromDate ?? ""}
            onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
          />
          <TextInput
            id="period-to"
            type="date"
            labelText="To"
            value={value.toDate ?? ""}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
          />
        </>
      )}
    </Stack>
  );
}
