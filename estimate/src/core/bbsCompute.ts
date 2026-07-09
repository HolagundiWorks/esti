/** BBS roll-up helpers for the estimate UI. */
import {
  computeMemberBBS,
  scheduleByDiameter,
  type BbsMember,
  type MemberInput,
} from "@esti/contracts";
import type { BbsMemberRow } from "./model.js";

export function computeAllMembers(rows: BbsMemberRow[]): BbsMember[] {
  return rows.map((r) => computeMemberBBS(r as MemberInput));
}

export function totalSteelKg(rows: BbsMemberRow[]): number {
  return Math.round(computeAllMembers(rows).reduce((s, m) => s + m.totalWeightKg, 0) * 10) / 10;
}

export function steelSchedule(rows: BbsMemberRow[]): { diaMm: number; weightKg: number }[] {
  return scheduleByDiameter(computeAllMembers(rows));
}

export function steelAmountPaise(
  schedule: { diaMm: number; weightKg: number }[],
  ratePaiseByDia: Record<number, number>,
): number {
  return schedule.reduce((s, d) => {
    const rate = ratePaiseByDia[d.diaMm] ?? 0;
    return s + Math.round(d.weightKg * rate);
  }, 0);
}
