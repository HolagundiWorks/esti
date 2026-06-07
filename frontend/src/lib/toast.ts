import { useEffect, useState } from "react";

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

export function pushToast(t: Omit<Toast, "id">, ttlMs = 6000): void {
  const toast = { ...t, id: ++seq };
  toasts = [...toasts, toast];
  emit();
  if (ttlMs > 0) setTimeout(() => dismissToast(toast.id), ttlMs);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
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
