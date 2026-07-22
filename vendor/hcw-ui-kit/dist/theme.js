/**
 * AORMS Material UI theme — the single source of colour + shape for every MUI
 * portal. Built entirely from the shared design tokens (`tokens.ts`) so the look
 * is identical everywhere it is mounted.
 *
 * The HCW-UI-Kit layer rules, encoded here so screens inherit them and never
 * re-specify them inline (full spec: docs/esti/HCW-UI-KIT.md):
 *  1. Layer 1 FLAT (hyperminimalist) — tables, text, surfaces at rest; square
 *     corners (0 radius). Rounded corners: buttons 4px, dialogs 8px.
 *  2. Layer 2 SOFT (neumorphic) — dialogs and text-entry wells; objects you work
 *     within.
 *  3. Layer 3 GLASS (glassmorphism) — the live layer: BUTTON HOVER takes the
 *     glass slab, and priority alerts (error/warning) read as tinted glass.
 *
 * MUI is the rendering engine; HCW owns appearance and patterns
 * (see `LAYOUT` · `SPACING` · `DENSITY` · catalog).
 */
import { createTheme } from "@mui/material/styles";
import { SCHEMES, recipesFor, densityFor, cogaFor, MOTION, RADIUS as GLASS_RADIUS, BUTTON_RADIUS as BTN_RADIUS, FONT_FAMILY, GLASS_BLUR, GLASS_SHADOW, BTN_LIFT, underlineAccent, glassAccentWash, ddFlatFor, focusRingFor, hexToRgba, NEU_INPUT_RADIUS, REDUCE_MOTION, TAB_ALERT_WIDTH, SPACING_UNIT, BREAKPOINTS, Z_INDEX, OPACITY, } from "./tokens.js";
/** Build the AORMS MUI theme. Exposed as a factory so a portal can layer small
 *  overrides on top if it must, while sharing 100% of the brand defaults.
 *
 *  `scheme` selects the semantic colour scheme (default `"light"` — the shipped
 *  brand). `"dark"` / `"highContrast"` are palette-complete SCAFFOLDS: the
 *  neumorphic/glass recipes remain light-tuned until they gain scheme variants,
 *  so treat non-light schemes as preview-grade (see tokens.ts § Colour schemes).
 *
 *  `density` selects comfortable (default) or compact control heights.
 *  `coga: "calm"` raises interactive floors and bumps caption/body type one step.
 *  `direction` sets MUI `theme.direction` for RTL-ready chrome. */
export function createAormsTheme(options) {
    const CDS = SCHEMES[options?.scheme ?? "light"];
    // Scheme-matched surface recipes (neu/glass materials) — see tokens.ts.
    const R = recipesFor(options?.scheme ?? "light");
    const cogaMode = options?.coga ?? "default";
    const dens = densityFor(options?.density ?? "comfortable", cogaMode);
    const coga = cogaFor(cogaMode);
    const type = coga.type;
    const direction = options?.direction ?? "ltr";
    return createTheme({
        direction,
        shape: { borderRadius: GLASS_RADIUS },
        // Scale tokens drive the theme (parity with MUI defaults → no layout shift):
        // 8px spacing grid, the shared breakpoint ladder, and one z-index stack so
        // themed MUI overlays and HCW chrome never fight.
        spacing: SPACING_UNIT,
        breakpoints: { values: BREAKPOINTS },
        zIndex: {
            appBar: Z_INDEX.appBar,
            drawer: Z_INDEX.drawer,
            modal: Z_INDEX.dialog,
            snackbar: Z_INDEX.toast,
            tooltip: Z_INDEX.tooltip,
        },
        palette: {
            mode: options?.scheme === "dark" ? "dark" : "light",
            primary: { main: CDS.accent, dark: CDS.accentDark, contrastText: CDS.onAccent },
            secondary: { main: CDS.accentDark, contrastText: CDS.onAccent },
            error: { main: CDS.supportError },
            warning: { main: CDS.supportWarning },
            success: { main: CDS.supportSuccess },
            info: { main: CDS.supportInfo },
            background: { default: CDS.background, paper: CDS.layer01 },
            text: { primary: CDS.textPrimary, secondary: CDS.textSecondary, disabled: CDS.textHelper },
            divider: CDS.borderSubtle,
        },
        typography: {
            fontFamily: FONT_FAMILY,
            button: { textTransform: "capitalize", fontWeight: 600, fontSize: type.body2 },
            h1: {
                fontWeight: 300,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                fontSize: type.display,
            },
            h2: {
                fontWeight: 300,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                fontSize: type.heading,
            },
            h3: {
                fontWeight: 400,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                fontSize: type.subtitle,
            },
            h4: {
                fontWeight: 500,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                fontSize: type.kpi,
            },
            h5: { fontWeight: 600, textTransform: "none", fontSize: type.body },
            h6: { fontWeight: 600, textTransform: "none", fontSize: type.body2 },
            subtitle1: { textTransform: "none", fontSize: type.body },
            subtitle2: { textTransform: "none", fontSize: type.body2 },
            body1: { fontSize: type.body },
            body2: { fontSize: type.body2 },
            caption: { fontSize: type.caption },
            overline: {
                letterSpacing: "0.08em",
                fontWeight: 600,
                fontSize: type.micro,
            },
        },
        components: {
            MuiPaper: {
                defaultProps: { elevation: 0, square: true },
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                        backgroundColor: CDS.background,
                        backdropFilter: GLASS_BLUR,
                        WebkitBackdropFilter: GLASS_BLUR,
                        border: "none",
                        borderRadius: 0,
                        boxShadow: GLASS_SHADOW,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: { backgroundColor: CDS.background, border: "none", boxShadow: "none", borderRadius: 0 },
                },
            },
            MuiAccordion: {
                defaultProps: { elevation: 0, square: true, disableGutters: true },
                styleOverrides: {
                    root: {
                        backgroundColor: "transparent",
                        backgroundImage: "none",
                        border: "none",
                        borderBottom: R.GLASS_BORDER,
                        boxShadow: "none",
                        borderRadius: 0,
                        "&:before": { display: "none" },
                        "&.Mui-expanded": { margin: 0 },
                    },
                },
            },
            MuiAccordionSummary: { styleOverrides: { root: { paddingInline: 0 } } },
            MuiAccordionDetails: { styleOverrides: { root: { paddingInline: 0 } } },
            MuiMenu: { styleOverrides: { paper: { ...R.FLAT_POP } } },
            MuiPopover: { styleOverrides: { paper: { ...R.FLAT_POP } } },
            MuiDialog: { styleOverrides: { paper: { ...R.NEU_POP } } },
            MuiDrawer: {
                styleOverrides: { paper: { backgroundColor: R.POP_FILL, border: R.GLASS_BORDER, borderRadius: 0 } },
            },
            MuiAppBar: {
                defaultProps: { elevation: 0, color: "transparent" },
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                        backgroundColor: R.POP_FILL,
                        backdropFilter: GLASS_BLUR,
                        WebkitBackdropFilter: GLASS_BLUR,
                        borderBottom: R.GLASS_BORDER,
                    },
                },
            },
            MuiButton: {
                defaultProps: { disableElevation: true, disableRipple: true },
                styleOverrides: {
                    root: ({ ownerState }) => {
                        const isError = ownerState.color === "error";
                        const isCta = ownerState.variant === "contained" && !isError;
                        const ink = isError ? CDS.supportError : isCta ? CDS.accent : CDS.ink;
                        const underline = underlineAccent(isError ? CDS.supportError : CDS.accent);
                        return {
                            borderRadius: BTN_RADIUS,
                            minHeight: dens.button,
                            fontWeight: isCta ? 700 : 600,
                            textTransform: "capitalize",
                            color: ink,
                            backgroundColor: "transparent",
                            background: "transparent",
                            border: "none",
                            boxShadow: "none",
                            // R7 — motion from tokens, never literals.
                            transition: `transform ${MOTION.duration.fast}ms ${MOTION.easing.standard}, box-shadow ${MOTION.duration.fast}ms ${MOTION.easing.standard}, color ${MOTION.duration.fast}ms ${MOTION.easing.standard}, background ${MOTION.duration.fast}ms ${MOTION.easing.standard}`,
                            // HOVER = Layer 3 GLASS: the label lifts onto a frosted glass slab
                            // (actionability itself glows), keeping the bottom accent line.
                            "&:hover": {
                                background: R.GLASS_SURFACE.background,
                                backdropFilter: R.GLASS_SURFACE.backdropFilter,
                                WebkitBackdropFilter: R.GLASS_SURFACE.WebkitBackdropFilter,
                                color: isError ? CDS.supportError : CDS.accentDark,
                                transform: BTN_LIFT,
                                boxShadow: `0 8px 24px ${hexToRgba(CDS.ink, 0.14)}, ${underline}`,
                            },
                            // Keyboard parity: a :focus-visible control lifts to the same Layer-3
                            // glass slab as hover AND shows the accent focus ring, so keyboard
                            // users see what's actionable (mouse-only :hover left them blind).
                            "&:focus-visible": {
                                ...focusRingFor(CDS.accent),
                                background: R.GLASS_SURFACE.background,
                                backdropFilter: R.GLASS_SURFACE.backdropFilter,
                                WebkitBackdropFilter: R.GLASS_SURFACE.WebkitBackdropFilter,
                                color: isError ? CDS.supportError : CDS.accentDark,
                                transform: BTN_LIFT,
                                boxShadow: `0 8px 24px ${hexToRgba(CDS.ink, 0.14)}, ${underline}`,
                            },
                            "&:active": {
                                transform: "none",
                                color: isError ? CDS.supportError : CDS.accent,
                                boxShadow: underline,
                            },
                            "&.Mui-disabled": {
                                boxShadow: "none",
                                opacity: 0.45,
                                transform: "none",
                                backgroundColor: "transparent",
                            },
                            // Respect "reduce motion": keep the colour/glass/underline cues but
                            // drop the transition and the translate lift (WCAG 2.3.3).
                            [REDUCE_MOTION]: {
                                transition: "none",
                                "&:hover": { transform: "none" },
                                "&:focus-visible": { transform: "none" },
                                "&:active": { transform: "none" },
                            },
                        };
                    },
                },
            },
            MuiLink: {
                defaultProps: { underline: "hover" },
                styleOverrides: { root: { color: CDS.supportInfo } },
            },
            // Priority notifications (Layer 3) — error/warning *standard* alerts read as
            // TINTED GLASS so they float above the calm flat canvas; info/success stay
            // quiet (Layer 1). *Filled* (ToastHost) uses solid support fills so transient
            // feedback stays high-contrast and scheme-aware.
            MuiAlert: {
                styleOverrides: {
                    root: ({ ownerState }) => {
                        const sev = ownerState.severity;
                        if (ownerState.variant === "filled") {
                            const fill = sev === "error"
                                ? CDS.supportError
                                : sev === "warning"
                                    ? CDS.supportWarning
                                    : sev === "success"
                                        ? CDS.supportSuccess
                                        : CDS.supportInfo;
                            // Saffron warning needs dark ink for AA; other support fills take on-color.
                            const ink = sev === "warning" ? CDS.ink : CDS.textOnColor;
                            return {
                                borderRadius: 0,
                                backgroundColor: fill,
                                color: ink,
                                border: `1px solid ${hexToRgba(fill, 0.35)}`,
                            };
                        }
                        if (ownerState.variant && ownerState.variant !== "standard")
                            return {};
                        if (sev === "error")
                            return {
                                ...R.GLASS_SURFACE,
                                background: hexToRgba(CDS.supportError, 0.1),
                                border: `1px solid ${hexToRgba(CDS.supportError, 0.25)}`,
                            };
                        if (sev === "warning")
                            return {
                                ...R.GLASS_SURFACE,
                                background: hexToRgba(CDS.supportWarning, 0.12),
                                border: `1px solid ${hexToRgba(CDS.supportWarning, 0.3)}`,
                            };
                        return {};
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        borderRadius: BTN_RADIUS,
                        width: dens.iconButton,
                        height: dens.iconButton,
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 0, height: dens.chip },
                    colorPrimary: { backgroundColor: CDS.accent, color: CDS.onAccent },
                },
            },
            MuiTabs: {
                styleOverrides: {
                    root: {
                        minHeight: dens.tab,
                        "&.MuiTabs-vertical .MuiTab-root": {
                            alignItems: "flex-start",
                            justifyContent: "flex-start",
                            textAlign: "left",
                            width: "100%",
                            maxWidth: "100%",
                        },
                    },
                    // Accent is an inset top rule on the tab — not a sliding bottom indicator.
                    indicator: { display: "none" },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        textTransform: "none",
                        borderRadius: 0,
                        minHeight: dens.tab,
                        minWidth: 0,
                        px: 1.5,
                        py: 1,
                        color: CDS.textSecondary,
                        backgroundColor: "transparent",
                        opacity: 1,
                        boxShadow: `inset 0 ${TAB_ALERT_WIDTH}px 0 0 transparent`,
                        transition: `color ${MOTION.duration.fast}ms ${MOTION.easing.standard}, box-shadow ${MOTION.duration.fast}ms ${MOTION.easing.standard}`,
                        "&:hover": {
                            backgroundColor: "transparent",
                            color: CDS.textPrimary,
                        },
                        "&.Mui-selected": {
                            color: CDS.textPrimary,
                            fontWeight: 600,
                            backgroundColor: "transparent",
                            boxShadow: `inset 0 ${TAB_ALERT_WIDTH}px 0 0 ${CDS.accent}`,
                        },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                },
            },
            MuiListSubheader: {
                styleOverrides: {
                    root: {
                        backgroundColor: "transparent",
                        color: CDS.textSecondary,
                        fontSize: type.micro,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        lineHeight: 1.4,
                        py: 1,
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        minHeight: dens.listItem,
                        borderRadius: 0,
                        "&.Mui-selected": { backgroundColor: CDS.layer02, "&:hover": { backgroundColor: CDS.layer02 } },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: { minWidth: dens.iconButton, color: CDS.textSecondary },
                },
            },
            MuiListItemText: {
                styleOverrides: {
                    primary: { fontSize: type.body2, fontWeight: 500 },
                    secondary: { fontSize: type.caption, color: CDS.textHelper },
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        minHeight: dens.menuItem,
                        "&.Mui-selected": { backgroundColor: CDS.layer02, "&:hover": { backgroundColor: CDS.layer02 } },
                    },
                },
            },
            MuiTextField: { defaultProps: { size: "small" } },
            MuiFormControl: { defaultProps: { size: "small" } },
            MuiSelect: { defaultProps: { size: "small" } },
            MuiAutocomplete: { defaultProps: { size: "small" }, styleOverrides: { paper: { ...R.FLAT_POP } } },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: NEU_INPUT_RADIUS,
                        minHeight: dens.input,
                        backgroundColor: R.NEU_FILL,
                        boxShadow: R.NEU_INSET,
                        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { border: "none" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "none" },
                        "&.Mui-focused": { boxShadow: R.NEU_INSET_FOCUS },
                        "&.Mui-error": { boxShadow: R.NEU_INSET_ERROR },
                        "&.Mui-disabled": { boxShadow: R.NEU_INSET, opacity: 0.6 },
                        "&:has(.MuiSelect-select)": { ...ddFlatFor(CDS) },
                    },
                    input: { py: dens.mode === "compact" ? 0.75 : 1 },
                },
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        borderRadius: NEU_INPUT_RADIUS,
                        minHeight: dens.input,
                        backgroundColor: R.NEU_FILL,
                        boxShadow: R.NEU_INSET,
                        "&:before": { display: "none" },
                        "&:after": { display: "none" },
                        "&:hover": { backgroundColor: R.NEU_FILL },
                        "&.Mui-focused": { backgroundColor: R.NEU_FILL, boxShadow: R.NEU_INSET_FOCUS },
                        "&.Mui-error": { boxShadow: R.NEU_INSET_ERROR },
                        "&:has(.MuiSelect-select)": { ...ddFlatFor(CDS) },
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        borderRadius: BTN_RADIUS,
                        minHeight: dens.button,
                        "&.Mui-selected": {
                            color: CDS.accent,
                            backgroundColor: glassAccentWash(CDS.accent, 0.3),
                            "&:hover": { backgroundColor: glassAccentWash(CDS.accent, 0.3) },
                        },
                    },
                },
            },
            // Form controls + feedback — previously un-themed (raw MUI defaults, off
            // the square/neu/accent language). Now token-driven: accent when active,
            // neutral track/rail, focus-ring parity, square where the language demands.
            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        color: CDS.textSecondary,
                        "&.Mui-checked": { color: CDS.accent },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                },
            },
            MuiRadio: {
                styleOverrides: {
                    root: {
                        color: CDS.textSecondary,
                        "&.Mui-checked": { color: CDS.accent },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                },
            },
            MuiSwitch: {
                styleOverrides: {
                    switchBase: {
                        "&.Mui-checked": { color: CDS.onAccent },
                        "&.Mui-checked + .MuiSwitch-track": { backgroundColor: CDS.accent, opacity: 1 },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                    track: { backgroundColor: CDS.textSecondary, opacity: OPACITY.muted },
                },
            },
            MuiSlider: {
                styleOverrides: {
                    root: { color: CDS.accent },
                    rail: { backgroundColor: CDS.borderStrong, opacity: 1 },
                    thumb: {
                        "&:hover, &.Mui-focusVisible": { boxShadow: `0 0 0 6px ${CDS.accentSoft}` },
                    },
                },
            },
            MuiLinearProgress: {
                styleOverrides: {
                    root: { borderRadius: 0, backgroundColor: CDS.layer02 },
                    bar: { backgroundColor: CDS.accent },
                },
            },
            MuiCircularProgress: {
                styleOverrides: { root: { color: CDS.accent } },
            },
            MuiSkeleton: {
                styleOverrides: {
                    root: { borderRadius: 0, backgroundColor: hexToRgba(CDS.ink, 0.06) },
                },
            },
            MuiBadge: {
                styleOverrides: {
                    badge: { fontWeight: 600 },
                    colorPrimary: { backgroundColor: CDS.accent, color: CDS.onAccent },
                },
            },
            // Governed ahead of first heavy use (MUI mapping 🟨 → 🟩): pagination,
            // steppers, and picker days follow the button language — BUTTON_RADIUS,
            // accent-active with onAccent ink, focus ring.
            MuiPaginationItem: {
                styleOverrides: {
                    root: {
                        borderRadius: BTN_RADIUS,
                        "&.Mui-selected": {
                            backgroundColor: CDS.accent,
                            color: CDS.onAccent,
                            "&:hover": { backgroundColor: CDS.accentDark },
                        },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                },
            },
            MuiStepIcon: {
                styleOverrides: {
                    root: {
                        color: CDS.layer02,
                        "&.Mui-active": { color: CDS.accent },
                        "&.Mui-completed": { color: CDS.supportSuccess },
                    },
                    text: { fill: CDS.textPrimary, fontWeight: 600 },
                },
            },
            MuiStepConnector: {
                styleOverrides: { line: { borderColor: CDS.borderSubtle } },
            },
            MuiPickerDay: {
                styleOverrides: {
                    root: {
                        borderRadius: BTN_RADIUS,
                        "&.Mui-selected": {
                            backgroundColor: CDS.accent,
                            color: CDS.onAccent,
                            "&:hover, &:focus": { backgroundColor: CDS.accentDark },
                        },
                        "&.Mui-focusVisible": focusRingFor(CDS.accent),
                    },
                    today: { border: `1px solid ${CDS.accent}` },
                },
            },
            // DatePicker popup shell — flat pop + hairline (inherits input theming on the field).
            MuiPickerPopper: {
                styleOverrides: {
                    paper: {
                        ...R.FLAT_POP,
                        borderRadius: 0,
                        backgroundColor: CDS.layer01,
                        border: `1px solid ${CDS.borderSubtle}`,
                    },
                },
            },
            MuiDateCalendar: {
                styleOverrides: {
                    root: {
                        backgroundColor: CDS.layer01,
                        color: CDS.textPrimary,
                        maxHeight: "none",
                    },
                },
            },
            MuiPickersCalendarHeader: {
                styleOverrides: {
                    root: { color: CDS.textPrimary, paddingInline: SPACING_UNIT },
                    label: { fontWeight: 600, fontSize: type.body2 },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderColor: hexToRgba(CDS.ink, 0.08),
                        py: dens.tableCellPy,
                    },
                    head: {
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontSize: type.micro,
                        fontWeight: 600,
                        color: CDS.textSecondary,
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        borderRadius: 0,
                        backgroundColor: CDS.ink,
                        color: CDS.textOnColor,
                        border: `1px solid ${CDS.borderStrong}`,
                        fontSize: type.micro,
                    },
                },
            },
            MuiDataGrid: {
                styleOverrides: {
                    root: {
                        borderRadius: 0,
                        backgroundColor: "transparent",
                        border: 0,
                        "--DataGrid-rowBorderColor": hexToRgba(CDS.ink, 0.07),
                        "--DataGrid-rowHeight": `${dens.dataGridRow}px`,
                        "--DataGrid-headerHeight": `${dens.dataGridRow}px`,
                    },
                    columnHeaders: {
                        backgroundColor: "transparent",
                        minHeight: dens.dataGridRow,
                        maxHeight: dens.dataGridRow,
                    },
                    columnHeader: { backgroundColor: "transparent" },
                    columnHeaderTitle: {
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontSize: type.micro,
                        fontWeight: 600,
                        color: CDS.textSecondary,
                    },
                    cell: { borderColor: hexToRgba(CDS.ink, 0.07) },
                    footerContainer: { borderColor: hexToRgba(CDS.ink, 0.08) },
                    row: {
                        minHeight: dens.dataGridRow,
                        maxHeight: dens.dataGridRow,
                        "&:hover": { backgroundColor: CDS.hoverSoft },
                        "&.Mui-selected": {
                            backgroundColor: CDS.accentSoft,
                            "&:hover": { backgroundColor: glassAccentWash(CDS.accent, 0.2) },
                        },
                    },
                },
            },
        },
    });
}
/** The shared, ready-to-use AORMS theme instance. */
export const aormsTheme = createAormsTheme();
/** HCW name for {@link aormsTheme}. Prefer this in new code. */
export const hcwTheme = aormsTheme;
/** HCW name for {@link createAormsTheme}. Prefer this in new code. */
export const createHcwTheme = createAormsTheme;
export default aormsTheme;
//# sourceMappingURL=theme.js.map