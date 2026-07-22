export type ToastKind = "error" | "success" | "info" | "warning";
export interface Toast {
    id: number;
    kind: ToastKind;
    title: string;
    subtitle?: string;
    /** Optional undo (Reason: slip recovery). */
    undoLabel?: string;
    onUndo?: () => void;
}
export declare function pushToast(t: Omit<Toast, "id">, ttlMs?: number): void;
export declare function dismissToast(id: number): void;
/** Test-only: clear all toasts + dedupe memory. */
export declare function resetToasts(): void;
/** Subscribe a component to the toast list. */
export declare function useToasts(): Toast[];
/** Renders the global toast stack — fixed bottom-right, above dialogs. */
export declare function ToastHost(): import("react").JSX.Element;
//# sourceMappingURL=Toast.d.ts.map