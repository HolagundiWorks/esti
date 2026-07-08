/**
 * AORMS Material UI theme — the single source of colour + shape for every MUI
 * portal. Built entirely from the shared design tokens (`tokens.ts`) so the look
 * is identical everywhere it is mounted. (The Carbon landing surface never mounts
 * these components.)
 *
 * Three hard rules, encoded here so screens inherit them and never re-specify
 * them inline (full spec: docs/esti/AORMS-BRANDING-KIT.md):
 *  1. Hyper-minimalist LIGHT palette, Radiant Orange accent (orange fills carry
 *     white text; links use slate).
 *  2. One soft-square radius everywhere (`shape.borderRadius`).
 *  3. Neumorphic is reserved (text inputs, dialogs, the floating dock); everything
 *     else is flat + borderless — buttons are pure text.
 */
import { createTheme, type Theme } from "@mui/material/styles";
// Theme augmentation so `components.MuiDataGrid` (MUI X) is type-known here.
import type {} from "@mui/x-data-grid/themeAugmentation";
import {
  colors as CDS,
  RADIUS as GLASS_RADIUS,
  BUTTON_RADIUS as BTN_RADIUS,
  FONT_FAMILY,
  GLASS_BORDER,
  GLASS_BLUR,
  GLASS_SHADOW,
  POP_FILL,
  NEU_POP,
  FLAT_POP,
  BTN_LIFT,
  UNDERLINE_ORANGE,
  UNDERLINE_RED,
  GLASS_ORANGE_30,
  NEU_FILL,
  NEU_INSET,
  NEU_INSET_FOCUS,
  NEU_INSET_ERROR,
  NEU_INPUT_RADIUS,
  DD_FLAT,
} from "./tokens.js";

/** Build the AORMS MUI theme. Exposed as a factory so a portal can layer small
 *  overrides on top if it must, while sharing 100% of the brand defaults. */
export function createAormsTheme(): Theme {
  return createTheme({
    shape: { borderRadius: GLASS_RADIUS },
    palette: {
      mode: "light",
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
            borderRadius: GLASS_RADIUS,
            boxShadow: GLASS_SHADOW,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { backgroundColor: CDS.background, border: "none", boxShadow: "none", borderRadius: GLASS_RADIUS },
        },
      },
      MuiAccordion: {
        defaultProps: { elevation: 0, square: true, disableGutters: true },
        styleOverrides: {
          root: {
            backgroundColor: "transparent",
            backgroundImage: "none",
            border: "none",
            borderBottom: GLASS_BORDER,
            boxShadow: "none",
            borderRadius: 0,
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: 0 },
          },
        },
      },
      MuiAccordionSummary: { styleOverrides: { root: { paddingInline: 0 } } },
      MuiAccordionDetails: { styleOverrides: { root: { paddingInline: 0 } } },
      MuiMenu: { styleOverrides: { paper: { ...FLAT_POP } } },
      MuiPopover: { styleOverrides: { paper: { ...FLAT_POP } } },
      MuiDialog: { styleOverrides: { paper: { ...NEU_POP } } },
      MuiDrawer: {
        styleOverrides: { paper: { backgroundColor: POP_FILL, border: GLASS_BORDER, borderRadius: 0 } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "transparent" },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: POP_FILL,
            backdropFilter: GLASS_BLUR,
            WebkitBackdropFilter: GLASS_BLUR,
            borderBottom: GLASS_BORDER,
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
              transition: "transform 130ms ease, box-shadow 130ms ease, color 130ms ease",
              "&:hover": {
                backgroundColor: "transparent",
                color: isError ? CDS.supportError : CDS.accentDark,
                transform: BTN_LIFT,
                boxShadow: underline,
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
            };
          },
        },
      },
      MuiLink: {
        defaultProps: { underline: "hover" },
        styleOverrides: { root: { color: CDS.supportInfo } },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: GLASS_RADIUS },
          colorPrimary: { backgroundColor: CDS.accent, color: CDS.onAccent },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: CDS.accent, height: 3 } } },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: "none", "&.Mui-selected": { color: CDS.accent, fontWeight: 600 } },
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
      MuiAutocomplete: { defaultProps: { size: "small" }, styleOverrides: { paper: { ...FLAT_POP } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: NEU_INPUT_RADIUS,
            backgroundColor: NEU_FILL,
            boxShadow: NEU_INSET,
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&.Mui-focused": { boxShadow: NEU_INSET_FOCUS },
            "&.Mui-error": { boxShadow: NEU_INSET_ERROR },
            "&.Mui-disabled": { boxShadow: NEU_INSET, opacity: 0.6 },
            "&:has(.MuiSelect-select)": { ...DD_FLAT },
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            borderRadius: NEU_INPUT_RADIUS,
            backgroundColor: NEU_FILL,
            boxShadow: NEU_INSET,
            "&:before": { display: "none" },
            "&:after": { display: "none" },
            "&:hover": { backgroundColor: NEU_FILL },
            "&.Mui-focused": { backgroundColor: NEU_FILL, boxShadow: NEU_INSET_FOCUS },
            "&.Mui-error": { boxShadow: NEU_INSET_ERROR },
            "&:has(.MuiSelect-select)": { ...DD_FLAT },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: GLASS_RADIUS,
            "&.Mui-selected": {
              color: CDS.accent,
              backgroundColor: GLASS_ORANGE_30,
              "&:hover": { backgroundColor: GLASS_ORANGE_30 },
            },
          },
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
            borderRadius: GLASS_RADIUS,
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
