import type { ReactNode } from "react";
/**
 * ConfirmModal — the ONE confirmation pattern for destructive actions (HCW
 * interaction contract: destroy always confirms; never `window.confirm`).
 * Render it controlled:
 *
 *   const [confirm, setConfirm] = useState<null | (() => void)>(null);
 *   <Button onClick={() => setConfirm(() => () => remove.mutate({ id }))}>Remove</Button>
 *   <ConfirmModal open={!!confirm} … onConfirm={() => { confirm?.(); setConfirm(null); }} />
 *
 * Promoted from the app (2026-07). Carries `aria-labelledby` so the dialog has an
 * accessible name (WCAG 4.1.2).
 */
export declare function ConfirmModal({ open, heading, body, confirmText, danger, pending, onConfirm, onClose, }: {
    open: boolean;
    heading?: string;
    body: ReactNode;
    confirmText?: string;
    danger?: boolean;
    pending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}): import("react").JSX.Element;
export default ConfirmModal;
