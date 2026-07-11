/**
 * Toast — the ONE transient-feedback primitive (HCW: success via toast; error
 * toasts say what failed). A tiny framework-free store + a fixed bottom-right
 * host rendering MUI Alerts. Promoted from the app (2026-07) so every portal
 * shares one feedback grammar.
 *
 *   pushToast({ kind: "success", title: "Invoice sent" });
 *   <ToastHost />   // once, near the app root
 */
import { Alert, AlertTitle, Box } from "@mui/material";
import { useEffect, useState } from "react";
import { Z_INDEX } from "./tokens.js";

export type ToastKind = "error" | "success" | "info" | "warning";
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
}

let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Suppress identical toasts within this window (query + mutation double-fire). */
const DEDUPE_MS = 4000;
const recentKeys = new Map<string, number>();

function toastKey(t: Omit<Toast, "id">): string {
  return `${t.kind}\0${t.title}\0${t.subtitle ?? ""}`;
}

export function pushToast(t: Omit<Toast, "id">, ttlMs = 6000): void {
  const key = toastKey(t);
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return;
  recentKeys.set(key, now);

  const toast = { ...t, id: ++seq };
  toasts = [...toasts, toast];
  emit();
  if (ttlMs > 0) setTimeout(() => dismissToast(toast.id), ttlMs);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Test-only: clear all toasts + dedupe memory. */
export function resetToasts(): void {
  toasts = [];
  recentKeys.clear();
  emit();
}

/** Subscribe a component to the toast list. */
export function useToasts(): Toast[] {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return toasts;
}

/** Renders the global toast stack — fixed bottom-right, above dialogs. */
export function ToastHost() {
  const list = useToasts();
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-atomic="false"
      sx={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: Z_INDEX.toast,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {list.map((t) => (
        <Alert key={t.id} severity={t.kind} variant="filled" onClose={() => dismissToast(t.id)}>
          <AlertTitle>{t.title}</AlertTitle>
          {t.subtitle}
        </Alert>
      ))}
    </Box>
  );
}
