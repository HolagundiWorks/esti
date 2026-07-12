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
      /** The goal/command — the mission the operation is tracked *toward*. Without
       *  this frame a live operation can't be tracked (progress needs a destination). */
      mission: string;
      /** The step in flight right now. */
      operation: string;
      /** The frame it runs against — the current tab/context. */
      context: string;
    }
  /** Just finished — a brief completion the supervisor sees before the rail goes calm.
   *  Auto-clears to idle after {@link DONE_LINGER_MS}. */
  | { status: "done" };

const DONE_LINGER_MS = 4000;

let activity: EstiActivity = { status: "idle" };
const listeners = new Set<() => void>();
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function setEstiActivity(next: EstiActivity): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  activity = next;
  for (const l of listeners) l();
  if (next.status === "done") {
    clearTimer = setTimeout(() => {
      clearTimer = null;
      activity = { status: "idle" };
      for (const l of listeners) l();
    }, DONE_LINGER_MS);
  }
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
