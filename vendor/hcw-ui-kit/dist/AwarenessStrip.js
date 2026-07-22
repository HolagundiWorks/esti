import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AwarenessStrip — Endsley situation-awareness ladder for the rail / stage head:
 *   state  → what is happening
 *   meaning → what it means
 *   next   → what happens next / what needs judgment
 *
 * Optional `loops` (Zeigarnik / goal-gradient): incomplete work, capped by
 * {@link CAPACITY.openLoops}. Renders nothing useful when all empty — calm idle.
 *
 *   <AwarenessStrip
 *     state="Orchestrating takeoff"
 *     meaning="3 of 7 sheets remaining"
 *     next="Waiting on you: approve scale"
 *     loops={[{ id: "1", label: "Draft invoice #442" }]}
 *   />
 */
import { Box, Stack, Typography } from "@mui/material";
import { typeScaleSx } from "./chrome-sx.js";
import { enforceCapacity } from "./capacity.js";
import { TRUST, colors } from "./tokens.js";
export function AwarenessStrip({ state, meaning, next, loops = [], judgment = false, }) {
    const visibleLoops = enforceCapacity("loops", loops);
    const hasAwareness = Boolean(state || meaning || next);
    const hasLoops = visibleLoops.length > 0;
    if (!hasAwareness && !hasLoops)
        return null;
    return (_jsxs(Box, { component: "section", "aria-label": "Situation awareness", sx: {
            display: "flex",
            flexDirection: "column",
            gap: 1,
            p: 1.5,
            borderBottom: `1px solid ${colors.borderSubtle}`,
        }, children: [state ? (_jsx(Typography, { sx: { ...typeScaleSx("label"), fontWeight: 700, color: colors.ink }, children: state })) : null, meaning ? (_jsx(Typography, { sx: { ...typeScaleSx("body2"), color: colors.textSecondary }, children: meaning })) : null, next ? (_jsxs(Typography, { sx: {
                    ...typeScaleSx("body2"),
                    fontWeight: judgment ? 700 : 500,
                    color: judgment ? colors.accent : colors.ink,
                }, children: [judgment ? `${TRUST.judgmentNeedsLabel}: ` : null, next] })) : null, hasLoops ? (_jsx(Stack, { component: "ul", spacing: 0.5, sx: { m: 0, pl: 2 }, children: visibleLoops.map((loop) => (_jsxs(Box, { component: "li", sx: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        ...typeScaleSx("caption"),
                        color: colors.textSecondary,
                    }, children: [_jsx("span", { children: loop.label }), loop.action] }, loop.id))) })) : null] }));
}
export default AwarenessStrip;
//# sourceMappingURL=AwarenessStrip.js.map