import { useEffect, useRef } from "react";

/**
 * Run `fn` only when `signal` CHANGES after mount (not on the first render).
 * Used to let a parent's rail button trigger an action inside a mounted child
 * (e.g. open a create dialog) by bumping a counter — without firing when the
 * child first mounts on a tab switch.
 */
export function useSignal(signal: number | undefined, fn: () => void): void {
  const prev = useRef(signal);
  useEffect(() => {
    if (signal !== undefined && signal !== prev.current) {
      prev.current = signal;
      fn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
}
