/**
 * Action outcome store — closes Norman's gulf of evaluation after dock commits.
 * Screens publish outcomes; stage head / rail can subscribe without coupling to
 * toast (toasts remain for transient alerts; outcomes are durable until cleared
 * or replaced).
 *
 *   const publish = usePublishOutcome();
 *   publish({ status: "success", label: "Project saved" });
 *   const outcome = useActionOutcome();
 */
import { useEffect, useState } from "react";
import { assertCapacity } from "./capacity.js";
import { CAPACITY } from "./tokens.js";
import { logUxEvent } from "./uxEvents.js";
let outcomes = [];
let seq = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
export function publishOutcome(o) {
    const row = {
        ...o,
        id: ++seq,
        at: o.at ?? Date.now(),
    };
    const projected = outcomes.length + 1;
    if (projected > CAPACITY.workingMemoryChunks) {
        assertCapacity("outcomes", projected);
    }
    outcomes = [row, ...outcomes].slice(0, CAPACITY.workingMemoryChunks);
    emit();
    const status = row.status === "error" ? "failure" : row.status === "success" ? "success" : "blocked";
    logUxEvent("ux.outcome", { status, source: "publishOutcome", label: row.label });
    return row;
}
export function clearOutcome(id) {
    outcomes = id == null ? [] : outcomes.filter((x) => x.id !== id);
    emit();
}
/** Test-only. */
export function resetOutcomes() {
    outcomes = [];
    seq = 0;
    emit();
}
export function useActionOutcome() {
    const [, force] = useState(0);
    useEffect(() => {
        const f = () => force((x) => x + 1);
        subs.add(f);
        return () => {
            subs.delete(f);
        };
    }, []);
    return outcomes[0] ?? null;
}
export function useActionOutcomes() {
    const [, force] = useState(0);
    useEffect(() => {
        const f = () => force((x) => x + 1);
        subs.add(f);
        return () => {
            subs.delete(f);
        };
    }, []);
    return outcomes;
}
/** Convenience for event handlers — stable publish function. */
export function usePublishOutcome() {
    return publishOutcome;
}
//# sourceMappingURL=ActionOutcome.js.map