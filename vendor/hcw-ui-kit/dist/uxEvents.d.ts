/**
 * UX KPI event bus — sink-agnostic telemetry for the HCW instrument
 * (docs/esti/HCW-UX-KPI-INSTRUMENT.md). Kit emits; consumers attach analytics.
 *
 *   setUxEventSink((name, payload) => analytics.track(name, payload));
 *   logUxEvent("ux.dock", { zone: "right", actionId: "save" });
 */
export type UxEventName = "ux.orient" | "ux.interrupt" | "ux.dock" | "ux.capacity_warn" | "ux.decision" | "ux.outcome" | "ux.a11y_gate" | "ux.mission";
export type UxEventPayload = Record<string, unknown>;
export type UxEventSink = (name: UxEventName, payload: UxEventPayload) => void;
/** Attach (or clear) the product telemetry sink. Default is no-op. */
export declare function setUxEventSink(next: UxEventSink | null): void;
/** Emit a structured UX event. No-op when no sink is set. */
export declare function logUxEvent(name: UxEventName, payload?: UxEventPayload): void;
/** Typed helpers for the KPI instrument vocabulary. */
export declare function logOrient(surfaceId: string, msToFourAnswers?: number): void;
export declare function logDecision(id: string, state: "pending" | "frozen" | "rejected", msOpen?: number): void;
export declare function logMission(id: string, state: "active" | "done" | "failed"): void;
export declare function logInterrupt(kind: "judgment" | "blocker" | "error" | "ambient", accepted: boolean): void;
/** Test-only — clears the sink. */
export declare function resetUxEventSink(): void;
//# sourceMappingURL=uxEvents.d.ts.map