import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { barUnitWeightKgM } from "@esti/contracts";
import { useMemo } from "react";
import { steelAmountPaise, steelSchedule, totalSteelKg } from "../core/bbsCompute.js";
import { inr } from "../lib/download.js";
import { useStore } from "../store.js";

/** Steel schedule rolled up by diameter — matches AORMS BBS viewer. */
export function SteelSchedulePanel() {
  const bbs = useStore((s) => s.model.bbs);
  const rates = useStore((s) => s.model.steelRatePaiseByDia);

  const schedule = useMemo(() => steelSchedule(bbs), [bbs]);
  const totalKg = useMemo(() => totalSteelKg(bbs), [bbs]);
  const totalPaise = useMemo(() => steelAmountPaise(schedule, rates), [schedule, rates]);

  if (bbs.length === 0) return null;

  return (
    <Stack gap={4}>
      <div>
        <h2 className="est-h2">Steel schedule</h2>
        <p className="est-help">
          By diameter (IS 456 / IS 2502). Total {totalKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg
          {totalPaise > 0 ? ` · ${inr(totalPaise)}` : ""}
        </p>
      </div>
      <TableContainer title="Steel by diameter">
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ø (mm)</TableHeader>
              <TableHeader>Unit wt (kg/m)</TableHeader>
              <TableHeader>Weight (kg)</TableHeader>
              <TableHeader>Rate (₹/kg)</TableHeader>
              <TableHeader>Amount</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedule.map((row) => {
              const rate = rates[row.diaMm] ?? 0;
              const amount = Math.round(row.weightKg * rate);
              return (
                <TableRow key={row.diaMm}>
                  <TableCell>{row.diaMm}</TableCell>
                  <TableCell>{barUnitWeightKgM(row.diaMm).toLocaleString("en-IN", { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell>{row.weightKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>{rate ? inr(rate) : "—"}</TableCell>
                  <TableCell>{rate ? inr(amount) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
