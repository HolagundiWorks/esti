import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
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
export function ConfirmModal({ open, heading = "Are you sure?", body, confirmText = "Delete", danger = true, pending = false, onConfirm, onClose, }) {
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "xs", "aria-labelledby": "confirm-modal-title", children: [_jsx(DialogTitle, { id: "confirm-modal-title", children: heading }), _jsx(DialogContent, { children: typeof body === "string" ? _jsx("p", { children: body }) : body }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, variant: "text", color: "inherit", children: "Cancel" }), _jsx(Button, { onClick: onConfirm, disabled: pending, variant: "contained", color: danger ? "error" : "primary", children: pending ? "Working…" : confirmText })] })] }));
}
export default ConfirmModal;
