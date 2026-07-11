/**
 * AORMS Material UI theme — the single source of colour + shape for every MUI
 * portal. Built entirely from the shared design tokens (`tokens.ts`) so the look
 * is identical everywhere it is mounted. (The Carbon landing surface never mounts
 * these components.)
 *
 * The HCW-UI-Kit layer rules, encoded here so screens inherit them and never
 * re-specify them inline (full spec: docs/esti/HCW-UI-KIT.md):
 *  1. Layer 1 FLAT (hyperminimalist) — tables, text, surfaces at rest; square
 *     corners (0 radius). Rounded corners: buttons 4px, dialogs 8px.
 *  2. Layer 2 SOFT (neumorphic) — dialogs and text-entry wells; objects you work
 *     within.
 *  3. Layer 3 GLASS (glassmorphism) — the live layer: BUTTON HOVER takes the
 *     glass slab, and priority alerts (error/warning) read as tinted glass.
 */
import { createTheme, type Theme } from "@mui/material/styles";
// Theme augmentation so `components.MuiDataGrid` / `MuiPickersDay` (MUI X) are
// type-known here.
import type {} from "@mui/x-data-grid/themeAugmentation";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import {
  SCHEMES,
  type SchemeName,
  recipesFor,
  MOTION,
  RADIUS as GLASS_RADIUS,
  BUTTON_RADIUS as BTN_RADIUS,
  FONT_FAMILY,
  GLASS_BLUR,
  GLASS_SHADOW,
  BTN_LIFT,
  UNDERLINE_ORANGE,
  UNDERLINE_RED,
  GLASS_ORANGE_30,
  NEU_INPUT_RADIUS,
  DD_FLAT,
  REDUCE_MOTION,
  FOCUS_RING,
  TAB_ALERT_WIDTH,
  SPACING_UNIT,
  BREAKPOINTS,
  Z_INDEX,
  OPACITY,
} from "./tokens.js";

/** Build the AORMS MUI theme. Exposed as a factory so a portal can layer small
 *  overrides on top if it must, while sharing 100% of the brand defaults.
 *
 *  `scheme` selects the semantic colour scheme (default `"light"` — the shipped
 *  brand). `"dark"` / `"highContrast"` are palette-complete SCAFFOLDS: the
 *  neumorphic/glass recipes remain light-tuned until they gain scheme variants,
 *  so treat non-light schemes as preview-grade (see tokens.ts § Colour schemes). */
export function createAormsTheme(options?: { scheme?: SchemeName }): Theme {
  const CDS = SCHEMES[options?.scheme ?? "light"];
  // Scheme-matched surface recipes (neu/glass materials) — see tokens.ts.
  const R = recipesFor(options?.scheme ?? "light");
  return createTheme({
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
      button: { textTransform: "capitalize", fontWeight: 600 },
      h1: { fontWeight: 300, letterSpacing: "0.01em", textTransform: "uppercase" },
      h2: { fontWeight: 300, letterSpacing: "0.01em", textTransform: "uppercase" },
      h3: { fontWeight: 400, letterSpacing: "0.01em", textTransform: "uppercase" },
      h4: { fontWeight: 500, letterSpacing: "0.01em", textTransform: "uppercase" },
      h5: { fontWeight: 600, textTransform: "none" },
      h6: { fontWeight: 600, textTransform: "none" },
      subtitle1: { textTransform: "none" },
      subtitle2: { textTransform: "none" },
      overline: { letterSpacing: "0.08em", fontWeight: 600 },
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
            const underline = isError ? UNDERLINE_RED : UNDERLINE_ORANGE;
            return {
              borderRadius: BTN_RADIUS,
              fontWeight: isCta ? 700 : 600,
              textTransform: "capitalize" as const,
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
                boxShadow: `0 8px 24px rgba(20, 21, 23, 0.14), ${underline}`,
              },
              // Keyboard parity: a :focus-visible control lifts to the same Layer-3
              // glass slab as hover AND shows the accent focus ring, so keyboard
              // users see what's actionable (mouse-only :hover left them blind).
              "&:focus-visible": {
                ...FOCUS_RING,
                background: R.GLASS_SURFACE.background,
                backdropFilter: R.GLASS_SURFACE.backdropFilter,
                WebkitBackdropFilter: R.GLASS_SURFACE.WebkitBackdropFilter,
                color: isError ? CDS.supportError : CDS.accentDark,
                transform: BTN_LIFT,
                boxShadow: `0 8px 24px rgba(20, 21, 23, 0.14), ${underline}`,
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
      // Priority notifications (Layer 3) — error/warning alerts read as TINTED
      // GLASS so they visibly float above the calm flat canvas; info/success stay
      // quiet (Layer 1).
      MuiAlert: {
        styleOverrides: {
          root: ({ ownerState }) => {
            if (ownerState.variant && ownerState.variant !== "standard") return {};
            if (ownerState.severity === "error")
              return {
                ...R.GLASS_SURFACE,
                background: "rgba(200, 68, 46, 0.10)",
                border: "1px solid rgba(200, 68, 46, 0.25)",
              };
            if (ownerState.severity === "warning")
              return {
                ...R.GLASS_SURFACE,
                background: "rgba(255, 153, 50, 0.12)",
                border: "1px solid rgba(255, 153, 50, 0.30)",
              };
            return {};
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 0 },
          colorPrimary: { backgroundColor: CDS.accent, color: CDS.onAccent },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
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
            minHeight: 40,
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
            "&.Mui-focusVisible": FOCUS_RING,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&.Mui-selected": { backgroundColor: CDS.layer02, "&:hover": { backgroundColor: CDS.layer02 } },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
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
            backgroundColor: R.NEU_FILL,
            boxShadow: R.NEU_INSET,
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&.Mui-focused": { boxShadow: R.NEU_INSET_FOCUS },
            "&.Mui-error": { boxShadow: R.NEU_INSET_ERROR },
            "&.Mui-disabled": { boxShadow: R.NEU_INSET, opacity: 0.6 },
            "&:has(.MuiSelect-select)": { ...DD_FLAT },
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            borderRadius: NEU_INPUT_RADIUS,
            backgroundColor: R.NEU_FILL,
            boxShadow: R.NEU_INSET,
            "&:before": { display: "none" },
            "&:after": { display: "none" },
            "&:hover": { backgroundColor: R.NEU_FILL },
            "&.Mui-focused": { backgroundColor: R.NEU_FILL, boxShadow: R.NEU_INSET_FOCUS },
            "&.Mui-error": { boxShadow: R.NEU_INSET_ERROR },
            "&:has(.MuiSelect-select)": { ...DD_FLAT },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: BTN_RADIUS,
            "&.Mui-selected": {
              color: CDS.accent,
              backgroundColor: GLASS_ORANGE_30,
              "&:hover": { backgroundColor: GLASS_ORANGE_30 },
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
            "&.Mui-focusVisible": FOCUS_RING,
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            color: CDS.textSecondary,
            "&.Mui-checked": { color: CDS.accent },
            "&.Mui-focusVisible": FOCUS_RING,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": { color: CDS.onAccent },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: CDS.accent, opacity: 1 },
            "&.Mui-focusVisible": FOCUS_RING,
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
          root: { borderRadius: 0, backgroundColor: "rgba(20, 21, 23, 0.06)" },
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
            "&.Mui-focusVisible": FOCUS_RING,
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
            "&.Mui-focusVisible": FOCUS_RING,
          },
          today: { border: `1px solid ${CDS.accent}` },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: "rgba(20, 21, 23, 0.08)" },
          head: {
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: CDS.textSecondary,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 0,
            backgroundColor: "#141517",
            color: "#FFFFFF",
            border: "1px solid rgba(20, 21, 23, 0.20)",
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: "transparent",
            border: 0,
            "--DataGrid-rowBorderColor": "rgba(20,21,23,0.07)",
          },
          columnHeaders: { backgroundColor: "transparent" },
          columnHeader: { backgroundColor: "transparent" },
          columnHeaderTitle: {
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: CDS.textSecondary,
          },
          cell: { borderColor: "rgba(20,21,23,0.07)" },
          footerContainer: { borderColor: "rgba(20,21,23,0.08)" },
          row: {
            "&:hover": { backgroundColor: CDS.hoverSoft },
            "&.Mui-selected": {
              backgroundColor: CDS.accentSoft,
              "&:hover": { backgroundColor: "rgba(255,79,24,0.20)" },
            },
          },
        },
      },
    },
  });
}

/** The shared, ready-to-use AORMS theme instance. */
export const aormsTheme = createAormsTheme();
export default aormsTheme;
