export type CapacityChannel = "kpi" | "dock" | "loops" | "toast" | "objectives" | "outcomes" | "alternatives";
export declare function capacityCap(channel: CapacityChannel): number;
/**
 * If `count` exceeds the channel cap, emit `ux.capacity_warn` and return the cap;
 * otherwise return `count`.
 */
export declare function assertCapacity(channel: CapacityChannel, count: number): number;
/**
 * Slice `items` to the channel cap. Emits `ux.capacity_warn` when truncated.
 */
export declare function enforceCapacity<T>(channel: CapacityChannel, items: readonly T[]): T[];
//# sourceMappingURL=capacity.d.ts.map