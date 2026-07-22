import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Toast — the ONE transient-feedback primitive (HCW: success via toast; error
 * toasts say what failed). Interruption budget from {@link INTERRUPTION} /
 * {@link CAPACITY} (Bailey/Iqbal): max concurrent stack, dedupe, error TTL.
 *
 *   pushToast({ kind: "success", title: "Invoice sent" });
 *   <ToastHost />   // once, near the app root
 */
import { Alert, AlertTitle, Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { assertCapacity } from "./capacity.js";
import { INTERRUPTION, LAYOUT, Z_INDEX } from "./tokens.js";
let toasts = [];
let seq = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const recentKeys = new Map();
function toastKey(t) {
    return `${t.kind}\0${t.title}\0${t.subtitle ?? ""}`;
}
function ttlFor(kind, override) {
    if (override != null)
        return override;
    return kind === "error" ? INTERRUPTION.errorTtlMs : INTERRUPTION.defaultTtlMs;
}
export function pushToast(t, ttlMs) {
    const key = toastKey(t);
    const now = Date.now();
    const last = recentKeys.get(key);
    if (last != null && now - last < INTERRUPTION.dedupeMs)
        return;
    recentKeys.set(key, now);
    const toast = { ...t, id: ++seq };
    // Drop oldest ambient toasts when over capacity; errors keep priority by
    // trimming from the front (oldest) until under budget.
    const projected = toasts.length + 1;
    if (projected > INTERRUPTION.maxConcurrentToasts) {
        assertCapacity("toast", projected);
    }
    toasts = [...toasts, toast];
    while (toasts.length > INTERRUPTION.maxConcurrentToasts) {
        const dropIdx = toasts.findIndex((x) => x.kind !== "error");
        toasts = toasts.filter((_, i) => i !== (dropIdx === -1 ? 0 : dropIdx));
    }
    emit();
    const ttl = ttlFor(t.kind, ttlMs);
    if (ttl > 0)
        setTimeout(() => dismissToast(toast.id), ttl);
}
export function dismissToast(id) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}
/** Test-only: clear all toasts + dedupe memory. */
export function resetToasts() {
    toasts = [];
    recentKeys.clear();
    emit();
}
/** Subscribe a component to the toast list. */
export function useToasts() {
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
    const hasError = list.some((t) => t.kind === "error");
    return (_jsx(Box, { role: "status", "aria-live": hasError ? "assertive" : "polite", "aria-atomic": "false", sx: {
            position: "fixed",
            insetInlineEnd: LAYOUT.margin,
            bottom: LAYOUT.margin,
            zIndex: Z_INDEX.toast,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            maxWidth: 360,
        }, children: list.map((t) => (_jsxs(Alert, { severity: t.kind, variant: "filled", onClose: () => dismissToast(t.id), action: t.onUndo ? (_jsx(Button, { color: "inherit", size: "small", onClick: () => {
                    t.onUndo?.();
                    dismissToast(t.id);
                }, children: t.undoLabel ?? "Undo" })) : undefined, children: [_jsx(AlertTitle, { children: t.title }), t.subtitle] }, t.id))) }));
}
//# sourceMappingURL=Toast.js.map