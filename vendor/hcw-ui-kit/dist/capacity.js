/**
 * Capacity enforcement helpers (Cowan / CAPACITY tokens).
 * Primitives call {@link enforceCapacity} to trim and optionally warn.
 */
import { CAPACITY } from "./tokens.js";
import { logUxEvent } from "./uxEvents.js";
const CAP_FOR = {
    kpi: CAPACITY.kpiStrip,
    dock: CAPACITY.dockVisibleActions,
    loops: CAPACITY.openLoops,
    toast: CAPACITY.toastStack,
    objectives: CAPACITY.railObjectives,
    outcomes: CAPACITY.workingMemoryChunks,
    alternatives: CAPACITY.decisionAlternatives,
};
export function capacityCap(channel) {
    return CAP_FOR[channel];
}
/**
 * If `count` exceeds the channel cap, emit `ux.capacity_warn` and return the cap;
 * otherwise return `count`.
 */
export function assertCapacity(channel, count) {
    const cap = CAP_FOR[channel];
    if (count > cap) {
        logUxEvent("ux.capacity_warn", { channel, count, cap });
    }
    return Math.min(count, cap);
}
/**
 * Slice `items` to the channel cap. Emits `ux.capacity_warn` when truncated.
 */
export function enforceCapacity(channel, items) {
    const cap = CAP_FOR[channel];
    if (items.length > cap) {
        logUxEvent("ux.capacity_warn", { channel, count: items.length, cap });
        return items.slice(0, cap);
    }
    return items;
}
//# sourceMappingURL=capacity.js.map