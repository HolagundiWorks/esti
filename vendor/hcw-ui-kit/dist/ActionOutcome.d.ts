export type OutcomeStatus = "pending" | "success" | "error";
export interface ActionOutcome {
    id: number;
    status: OutcomeStatus;
    label: string;
    detail?: string;
    at: number;
}
export declare function publishOutcome(o: Omit<ActionOutcome, "id" | "at"> & {
    at?: number;
}): ActionOutcome;
export declare function clearOutcome(id?: number): void;
/** Test-only. */
export declare function resetOutcomes(): void;
export declare function useActionOutcome(): ActionOutcome | null;
export declare function useActionOutcomes(): ActionOutcome[];
/** Convenience for event handlers — stable publish function. */
export declare function usePublishOutcome(): typeof publishOutcome;
//# sourceMappingURL=ActionOutcome.d.ts.map