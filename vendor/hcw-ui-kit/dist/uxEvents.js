/**
 * UX KPI event bus — sink-agnostic telemetry for the HCW instrument
 * (docs/esti/HCW-UX-KPI-INSTRUMENT.md). Kit emits; consumers attach analytics.
 *
 *   setUxEventSink((name, payload) => analytics.track(name, payload));
 *   logUxEvent("ux.dock", { zone: "right", actionId: "save" });
 */
let sink = null;
/** Attach (or clear) the product telemetry sink. Default is no-op. */
export function setUxEventSink(next) {
    sink = next;
}
/** Emit a structured UX event. No-op when no sink is set. */
export function logUxEvent(name, payload = {}) {
    sink?.(name, payload);
}
/** Typed helpers for the KPI instrument vocabulary. */
export function logOrient(surfaceId, msToFourAnswers) {
    logUxEvent("ux.orient", {
        surfaceId,
        ...(msToFourAnswers != null ? { msToFourAnswers } : {}),
    });
}
export function logDecision(id, state, msOpen) {
    logUxEvent("ux.decision", {
        id,
        state,
        ...(msOpen != null ? { msOpen } : {}),
    });
}
export function logMission(id, state) {
    logUxEvent("ux.mission", { id, state });
}
export function logInterrupt(kind, accepted) {
    logUxEvent("ux.interrupt", { kind, accepted });
}
/** Test-only — clears the sink. */
export function resetUxEventSink() {
    sink = null;
}
//# sourceMappingURL=uxEvents.js.map