/**
 * Critical Path Method — day-index scheduling from activity durations and dependencies.
 */

export type CpmActivityInput = {
  id: string;
  durationDays: number;
};

export type CpmDependencyInput = {
  predecessorId: string;
  successorId: string;
  type: "FS" | "SS" | "FF" | "SF";
  lagDays: number;
};

export type CpmActivityResult = {
  id: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
};

export class CpmCycleError extends Error {
  constructor(message = "Dependency cycle detected") {
    super(message);
    this.name = "CpmCycleError";
  }
}

function topoSort(
  activityIds: string[],
  deps: CpmDependencyInput[],
): string[] {
  const succs = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of activityIds) indegree.set(id, 0);
  for (const d of deps) {
    if (!indegree.has(d.predecessorId) || !indegree.has(d.successorId)) continue;
    succs.set(d.predecessorId, [...(succs.get(d.predecessorId) ?? []), d.successorId]);
    indegree.set(d.successorId, (indegree.get(d.successorId) ?? 0) + 1);
  }
  const queue = activityIds.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const s of succs.get(id) ?? []) {
      indegree.set(s, (indegree.get(s) ?? 0) - 1);
      if (indegree.get(s) === 0) queue.push(s);
    }
  }
  if (order.length !== activityIds.length) throw new CpmCycleError();
  return order;
}

function constraintStart(
  type: CpmDependencyInput["type"],
  predES: number,
  predEF: number,
  predDur: number,
  succDur: number,
  lag: number,
): number {
  switch (type) {
    case "FS":
      return predEF + lag + 1;
    case "SS":
      return predES + lag;
    case "FF":
      return predEF + lag - succDur + 1;
    case "SF":
      return predES + lag - succDur + 1;
    default:
      return predEF + lag + 1;
  }
}

function backwardLateFinish(
  type: CpmDependencyInput["type"],
  predDur: number,
  succLS: number,
  succLF: number,
  lag: number,
): number {
  switch (type) {
    case "FS":
      return succLS - lag - 1;
    case "SS":
      return succLS - lag + predDur - 1;
    case "FF":
      return succLF - lag;
    case "SF":
      return succLF - lag + predDur - 1;
    default:
      return succLS - lag - 1;
  }
}

export function runCpm(
  activities: CpmActivityInput[],
  dependencies: CpmDependencyInput[],
): CpmActivityResult[] {
  const dur = new Map(activities.map((a) => [a.id, Math.max(1, a.durationDays)]));
  const ids = activities.map((a) => a.id);
  const order = topoSort(ids, dependencies);

  const predsBySucc = new Map<string, CpmDependencyInput[]>();
  const succsByPred = new Map<string, CpmDependencyInput[]>();
  for (const d of dependencies) {
    predsBySucc.set(d.successorId, [...(predsBySucc.get(d.successorId) ?? []), d]);
    succsByPred.set(d.predecessorId, [...(succsByPred.get(d.predecessorId) ?? []), d]);
  }

  const ES = new Map<string, number>();
  const EF = new Map<string, number>();

  for (const id of order) {
    const duration = dur.get(id) ?? 1;
    const preds = predsBySucc.get(id) ?? [];
    let es = 0;
    for (const p of preds) {
      const predDur = dur.get(p.predecessorId) ?? 1;
      const predES = ES.get(p.predecessorId) ?? 0;
      const predEF = EF.get(p.predecessorId) ?? predES + predDur - 1;
      es = Math.max(
        es,
        constraintStart(p.type, predES, predEF, predDur, duration, p.lagDays),
      );
    }
    ES.set(id, es);
    EF.set(id, es + duration - 1);
  }

  const projectFinish = Math.max(...ids.map((id) => EF.get(id) ?? 0));

  const LS = new Map<string, number>();
  const LF = new Map<string, number>();

  for (const id of [...order].reverse()) {
    const duration = dur.get(id) ?? 1;
    const succs = succsByPred.get(id) ?? [];
    let lf = projectFinish;
    if (succs.length === 0) {
      lf = projectFinish;
    } else {
      lf = Math.min(
        ...succs.map((s) => {
          const succDur = dur.get(s.successorId) ?? 1;
          const succLS = LS.get(s.successorId) ?? projectFinish - succDur + 1;
          const succLF = LF.get(s.successorId) ?? succLS + succDur - 1;
          const predDur = dur.get(id) ?? 1;
          return backwardLateFinish(s.type, predDur, succLS, succLF, s.lagDays);
        }),
      );
    }
    LF.set(id, lf);
    LS.set(id, lf - duration + 1);
  }

  return ids.map((id) => {
    const es = ES.get(id) ?? 0;
    const ef = EF.get(id) ?? es;
    const ls = LS.get(id) ?? es;
    const lf = LF.get(id) ?? ef;
    const totalFloat = ls - es;
    return {
      id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      isCritical: totalFloat <= 0,
    };
  });
}

export function dayOffsetToIso(projectStart: string, dayOffset: number): string {
  const d = new Date(`${projectStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

export function isoToDayOffset(projectStart: string, iso: string): number {
  const start = new Date(`${projectStart}T12:00:00Z`).getTime();
  const target = new Date(`${iso}T12:00:00Z`).getTime();
  return Math.round((target - start) / 86_400_000);
}
