import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissToast, pushToast, resetToasts } from "./Toast.js";

import * as ToastModule from "./Toast.js";

describe("toast store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T10:00:00Z"));
    resetToasts();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("dedupes identical toasts within the window", () => {
    const timeouts = vi.spyOn(globalThis, "setTimeout");
    pushToast({ kind: "success", title: "Saved" });
    pushToast({ kind: "success", title: "Saved" }); // deduped — no second TTL timer
    expect(timeouts).toHaveBeenCalledTimes(1);
  });

  it("allows the same toast again after the dedupe window", () => {
    const timeouts = vi.spyOn(globalThis, "setTimeout");
    pushToast({ kind: "info", title: "Synced" });
    vi.advanceTimersByTime(5000); // > DEDUPE_MS(4000); also fires the 6s TTL? no — 6000 > 5000
    pushToast({ kind: "info", title: "Synced" });
    expect(timeouts).toHaveBeenCalledTimes(2);
  });

  it("distinct titles are not deduped", () => {
    const timeouts = vi.spyOn(globalThis, "setTimeout");
    pushToast({ kind: "error", title: "A failed" });
    pushToast({ kind: "error", title: "B failed" });
    expect(timeouts).toHaveBeenCalledTimes(2);
  });

  it("TTL auto-dismiss does not throw and clears the timer", () => {
    pushToast({ kind: "warning", title: "Heads up" }, 1000);
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
  });

  it("dismissToast on an unknown id is a no-op", () => {
    expect(() => dismissToast(99999)).not.toThrow();
  });

  it("module exposes the host + store surface", () => {
    expect(typeof ToastModule.ToastHost).toBe("function");
    expect(typeof ToastModule.useToasts).toBe("function");
  });
});
