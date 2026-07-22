import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ActionOutcomeBanner — stage-head display for {@link useActionOutcome}.
 * Flat layer; success is calm, error is tinted. Empty when no outcome.
 */
import { Alert, AlertTitle, Box, Button } from "@mui/material";
import { clearOutcome, useActionOutcome } from "./ActionOutcome.js";
export function ActionOutcomeBanner({ onDismiss, } = {}) {
    const outcome = useActionOutcome();
    if (!outcome)
        return null;
    const severity = outcome.status === "error" ? "error" : outcome.status === "pending" ? "info" : "success";
    return (_jsx(Box, { sx: { mb: 2 }, children: _jsxs(Alert, { severity: severity, variant: "outlined", onClose: () => {
                clearOutcome(outcome.id);
                onDismiss?.();
            }, action: outcome.status === "pending" ? (_jsx(Button, { color: "inherit", size: "small", disabled: true, children: "Working\u2026" })) : undefined, children: [_jsx(AlertTitle, { children: outcome.label }), outcome.detail] }) }));
}
export default ActionOutcomeBanner;
//# sourceMappingURL=ActionOutcomeBanner.js.map