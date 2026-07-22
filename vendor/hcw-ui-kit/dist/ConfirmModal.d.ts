import type { ReactNode } from "react";
/**
 * ConfirmModal — confirmation for destructive / consequential actions (HCW:
 * destroy always confirms; never `window.confirm`).
 *
 * Error taxonomy (Reason):
 * - **slip** — unintended action; confirm + optional undo path after.
 * - **mistake** — wrong belief/default; show `reason` explaining why blocked or
 *   what will change, then confirm.
 *
 *   <ConfirmModal open kind="mistake" reason="This client has open invoices." … />
 */
export type ConfirmKind = "slip" | "mistake";
export type ConfirmModalProps = {
    open: boolean;
    heading?: string;
    body: ReactNode;
    /** Mistake-path explanation (why this is consequential / blocked context). */
    reason?: ReactNode;
    kind?: ConfirmKind;
    confirmText?: string;
    danger?: boolean;
    pending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
};
export declare function ConfirmModal({ open, heading, body, reason, kind, confirmText, danger, pending, onConfirm, onClose, }: ConfirmModalProps): import("react").JSX.Element;
export default ConfirmModal;
//# sourceMappingURL=ConfirmModal.d.ts.map