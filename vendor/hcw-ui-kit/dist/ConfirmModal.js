import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { typeScaleSx } from "./chrome-sx.js";
import { colors } from "./tokens.js";
export function ConfirmModal({ open, heading = "Are you sure?", body, reason, kind = "slip", confirmText = "Delete", danger = true, pending = false, onConfirm, onClose, }) {
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "xs", "aria-labelledby": "confirm-modal-title", children: [_jsx(DialogTitle, { id: "confirm-modal-title", children: heading }), _jsxs(DialogContent, { children: [typeof body === "string" ? _jsx("p", { children: body }) : body, (kind === "mistake" || reason) && reason ? (_jsx(Typography, { component: "div", sx: {
                            mt: 2,
                            p: 1.5,
                            backgroundColor: colors.layer02,
                            borderInlineStart: `3px solid ${danger ? colors.supportError : colors.accent}`,
                            ...typeScaleSx("body2"),
                            color: colors.textSecondary,
                        }, children: reason })) : null] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, variant: "text", color: "inherit", children: "Cancel" }), _jsx(Button, { onClick: onConfirm, disabled: pending, variant: "contained", color: danger ? "error" : "primary", children: pending ? "Working…" : confirmText })] })] }));
}
export default ConfirmModal;
//# sourceMappingURL=ConfirmModal.js.map