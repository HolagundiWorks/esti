/**
 * AORMS Material UI theme — the single source of colour + shape for the migrated
 * app (workspace, panels and all portals). The **landing page stays on Carbon**
 * and never mounts these components.
 *
 * Three hard rules from the migration brief, encoded here so screens inherit them
 * for free and never re-specify them inline:
 *
 *  1. HYPER-MINIMALIST LIGHT PALETTE, YELLOW ACCENT. The product rides the **MP025**
 *     scheme (Alex Cristache): a soft off-white canvas, near-white frosted cards,
 *     deep-teal ink, with **Forsythia yellow the signature accent** (CTAs, active
 *     states, highlights) and Deep Saffron on hover. Yellow is used as a *fill*
 *     only — text and links stay dark/teal for legibility. Warm Mystic Mint marks
 *     selected surfaces. Airy whitespace, hairline separators, near-flat shadows —
 *     a deliberately un-Carbon, un-enterprise feel.
 *  2. SQUARE CORNERS EVERYWHERE. `shape.borderRadius = 0` plus explicit
 *     `borderRadius: 0` on every surface/control component. No rounded corners.
 *  3. LIQUID GLASS (light). Paper/Card/Drawer/AppBar/Menu surfaces are translucent
 *     white with a subtle backdrop blur — frosted panels over the light ambient
 *     backdrop the app shell paints (glass.scss).
 *
 * This file (and everything under src/theme/) is the ONE place raw colour values
 * live — it is exempt from the visual guard exactly like landing.scss.
 */
import { createTheme } from "@mui/material/styles";
// Theme augmentation so `components.MuiDataGrid` (MUI X) is type-known here.
import type {} from "@mui/x-data-grid/themeAugmentation";

// ── Design language: MP025 — hyper-minimalist LIGHT, YELLOW accent. A cool
// off-white canvas with near-white cards; deep-teal ink; Forsythia yellow is the
// signature accent (fills only) with Deep Saffron on hover; Mystic Mint marks
// selection. Status colours stay in the same family so state reads on light.
const CDS = {
  background:     "#F1F6F4", // Arctic Powder — soft off-white canvas
  layer01:        "#FFFFFF", // near-white card surface
  layer02:        "#D9E8E2", // Mystic Mint — secondary/quiet + selected surface
  borderSubtle:   "rgba(23, 43, 54, 0.10)", // hairline separator (Oceanic Noir @ 10%)
  borderStrong:   "rgba(23, 43, 54, 0.20)",
  textPrimary:    "#172B36", // Oceanic Noir — ink
  textSecondary:  "#516069", // muted teal-grey
  textHelper:     "#8a969c", // quiet label grey
  textOnColor:    "#FFFFFF", // on deep-teal / dark fills
  ink:            "#172B36", // Oceanic Noir — text on the yellow accent
  teal:           "#114C5A", // Nocturnal Expedition — links + info
  accentYellow:   "#FFC801", // Forsythia — THE accent (fills, active states)
  accentYellowSoft: "rgba(255, 200, 1, 0.16)", // yellow wash (selected rows)
  accentOrange:   "#FF9932", // Deep Saffron — accent hover
  mintSoft:       "rgba(217, 232, 226, 0.55)", // Mystic Mint wash (hover)
  supportSuccess: "#1B7F5A", // deep teal-green (reads on light)
  supportWarning: "#FF9932", // Deep Saffron
  supportError:   "#C8442E", // burnt red (warm family)
  supportInfo:    "#114C5A", // Nocturnal teal
} as const;

// ── Liquid-glass surface constants (light — shared with glass.scss) ──────────
// Translucent white with a soft blur; near-flat shadow so cards read as clean
// hyper-minimal panels rather than heavy floating glass.
const GLASS_FILL   = "rgba(255, 255, 255, 0.72)";
const GLASS_BORDER = "1px solid rgba(23, 43, 54, 0.08)";
const GLASS_BLUR   = "blur(12px) saturate(1.06)";
const GLASS_SHADOW = "0 1px 2px rgba(23, 43, 54, 0.05)";
// Pop-over surfaces (menus, dialogs, app bar) sit over content, so they use a
// near-opaque white fill for crisp legibility.
const POP_FILL     = "rgba(255, 255, 255, 0.96)";

export const muiTheme = createTheme({
  shape: { borderRadius: 0 },
  palette: {
    mode: "light",
    // Yellow is the signature accent (fills only); text/links use ink/teal.
    primary:   { main: CDS.accentYellow, dark: CDS.accentOrange, contrastText: CDS.ink },
    secondary: { main: CDS.accentOrange, contrastText: CDS.ink },
    error:     { main: CDS.supportError },
    warning:   { main: CDS.supportWarning },
    success:   { main: CDS.supportSuccess },
    info:      { main: CDS.teal },
    background: { default: CDS.background, paper: CDS.layer01 },
    text: {
      primary:   CDS.textPrimary,
      secondary: CDS.textSecondary,
      disabled:  CDS.textHelper,
    },
    divider: CDS.borderSubtle,
  },
  typography: {
    // Brand font — Open Sans (OFL, self-hosted via @fontsource) across the whole
    // product; mirrors --esti-font-sans and the Carbon runtime override in styles.scss.
    fontFamily:
      "'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
    // Hyper-minimal readouts: large numerics run light so the value dominates the
    // small muted label above it (the smart-home dashboard idiom).
    h1: { fontWeight: 300, letterSpacing: "-0.01em" },
    h2: { fontWeight: 300, letterSpacing: "-0.01em" },
    h3: { fontWeight: 300, letterSpacing: "-0.01em" },
    h4: { fontWeight: 400 },
    overline: { letterSpacing: "0.08em", fontWeight: 600 },
  },
  components: {
    // Tiles / cards — the light frosted-glass panel.
    MuiPaper: {
      defaultProps: { elevation: 0, square: true },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: GLASS_FILL,
          backdropFilter: GLASS_BLUR,
          WebkitBackdropFilter: GLASS_BLUR,
          border: GLASS_BORDER,
          borderRadius: 0,
          boxShadow: GLASS_SHADOW,
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    // Pop surfaces — near-opaque white for crisp readability over content.
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: POP_FILL, border: GLASS_BORDER, borderRadius: 0 },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { backgroundColor: POP_FILL, border: GLASS_BORDER, borderRadius: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: POP_FILL, border: GLASS_BORDER, borderRadius: 0 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: POP_FILL, border: GLASS_BORDER, borderRadius: 0 },
      },
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
    // Controls — all square. Yellow is the accent, but only as a FILL: the
    // contained button is Forsythia with ink text (Saffron on hover). Text and
    // outlined primary buttons keep ink text so labels stay legible on light.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 0,
          fontWeight: 600,
          ...(ownerState.color === "primary" && ownerState.variant === "contained" && {
            color: CDS.ink,
            backgroundColor: CDS.accentYellow,
            "&:hover": { backgroundColor: CDS.accentOrange },
          }),
          ...(ownerState.color === "primary" && ownerState.variant === "text" && {
            color: CDS.ink,
            "&:hover": { backgroundColor: CDS.mintSoft },
          }),
          ...(ownerState.color === "primary" && ownerState.variant === "outlined" && {
            color: CDS.ink,
            borderColor: CDS.accentYellow,
            "&:hover": { borderColor: CDS.accentOrange, backgroundColor: "rgba(255,200,1,0.10)" },
          }),
        }),
      },
    },
    // Links use readable teal, never the yellow accent.
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: { root: { color: CDS.teal } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 0 },
        colorPrimary: { backgroundColor: CDS.accentYellow, color: CDS.ink },
      },
    },
    // Tabs: yellow indicator, but the selected label stays ink (not yellow).
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: CDS.accentYellow, height: 3 } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", "&.Mui-selected": { color: CDS.ink, fontWeight: 600 } },
      },
    },
    // Selected list rows (nav, menus) use a warm Mystic Mint wash, not grey.
    MuiListItemButton: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: CDS.layer02,
            "&:hover": { backgroundColor: CDS.layer02 },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: CDS.layer02,
            "&:hover": { backgroundColor: CDS.layer02 },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiFilledInput: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "rgba(23, 43, 54, 0.08)" },
        // Tiny uppercase eyebrow headers, matching the DataGrid.
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
          backgroundColor: "#172B36",
          color: "#FFFFFF",
          border: "1px solid rgba(23, 43, 54, 0.20)",
        },
      },
    },
    // MUI X DataGrid — square, light frosted surface, hairline row rules (the
    // standard table primitive going forward; replaces Carbon DataTable).
    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: GLASS_FILL,
          backdropFilter: GLASS_BLUR,
          WebkitBackdropFilter: GLASS_BLUR,
          border: GLASS_BORDER,
          "--DataGrid-rowBorderColor": "rgba(23,43,54,0.07)",
        },
        columnHeaders: { backgroundColor: "rgba(217,232,226,0.55)" },
        columnHeader: { backgroundColor: "transparent" },
        // Tiny uppercase eyebrow headers — the MP025 hyper-minimal table idiom.
        columnHeaderTitle: {
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: CDS.textSecondary,
        },
        cell: { borderColor: "rgba(23,43,54,0.07)" },
        footerContainer: { borderColor: "rgba(23,43,54,0.08)" },
        // Mint hover, yellow-wash selection (the signature accent).
        row: {
          "&:hover": { backgroundColor: CDS.mintSoft },
          "&.Mui-selected": {
            backgroundColor: CDS.accentYellowSoft,
            "&:hover": { backgroundColor: "rgba(255,200,1,0.22)" },
          },
        },
      },
    },
  },
});

export default muiTheme;
