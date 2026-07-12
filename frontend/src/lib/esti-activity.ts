import { useSyncExternalStore } from "react";

/**
 * ESTI activity — the shared signal for the AI-orchestration spatial model
 * (docs/esti/HCW-AI-ORCHESTRATION-UX.md). The command bar (Ask ESTI) publishes what
 * ESTI is orchestrating; the **rail** subscribes and shows it. Content in the stage,
 * orchestration in the rail, command at the bottom bar — this store is the wire
 * between the command and the rail.
 *
 * Session-scoped and ephemeral (module state; cleared on reload).
 */
export type EstiActivity =
  | { status: "idle" }
  | {
      status: "orchestrating";
      /** One-line description of the operation in flight. */
      operation: string;
      /** The frame it runs against — the current tab/context. */
      context: string;
    };

let activity: EstiActivity = { status: "idle" };
const listeners = new Set<() => void>();

export function setEstiActivity(next: EstiActivity): void {
  activity = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reactive read of the current ESTI activity. */
export function useEstiActivity(): EstiActivity {
  return useSyncExternalStore(
    subscribe,
    () => activity,
    () => activity,
  );
}
