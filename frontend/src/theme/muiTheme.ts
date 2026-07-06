/**
 * AORMS Material UI theme — the single source of colour + shape for the migrated
 * app (workspace, panels and all portals). The **landing page stays on Carbon**
 * and never mounts these components.
 *
 * Three hard rules from the migration brief, encoded here so screens inherit them
 * for free and never re-specify them inline:
 *
 *  1. HYPER-MINIMALIST LIGHT PALETTE, RADIANT ORANGE ACCENT (AORMS Branding Kit).
 *     A clean Fog-Gray canvas (`#F2F4F7`), Pure-White cards (`#FFFFFF`), Coal-Black
 *     ink (`#141517`), with **Radiant Orange `#FF4F18` the signature accent** (CTAs,
 *     active states, highlights) and a deeper orange on hover. Orange carries WHITE
 *     text. Airy whitespace, hairline separators, near-flat shadows — a deliberately
 *     un-Carbon, un-enterprise feel. Full spec: `docs/esti/AORMS-BRANDING-KIT.md`.
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

// ── Design language: hyper-minimalist LIGHT, RADIANT ORANGE accent. A clean
// Fog-Gray canvas with Pure-White cards; Coal-Black ink; Radiant Orange is the
// signature accent (fills + active states) — carrying WHITE text, unlike the old
// yellow which needed dark ink. Status colours stay coherent on light.
const CDS = {
  background:     "#F2F4F7", // Fog Gray — clean cool canvas
  layer01:        "#FFFFFF", // Pure White — card surface
  layer02:        "#E7EAF0", // quiet fog — secondary/quiet + selected surface
  borderSubtle:   "rgba(20, 21, 23, 0.10)", // hairline separator (Coal Black @ 10%)
  borderStrong:   "rgba(20, 21, 23, 0.20)",
  textPrimary:    "#141517", // Coal Black — ink
  textSecondary:  "#5b616b", // muted slate-grey
  textHelper:     "#8a9099", // quiet label grey
  textOnColor:    "#FFFFFF", // on orange / dark fills
  ink:            "#141517", // Coal Black — primary text/ink
  onAccent:       "#FFFFFF", // Pure White — text on the orange accent
  accent:         "#FF4F18", // Radiant Orange — THE accent (fills, active states)
  accentSoft:     "rgba(255, 79, 24, 0.14)", // orange wash (selected rows)
  accentDark:     "#DB3E0F", // deeper orange — accent hover
  hoverSoft:      "rgba(20, 21, 23, 0.04)", // neutral row/hover wash
  supportSuccess: "#1B7F5A", // deep teal-green (reads on light)
  supportWarning: "#FF9932", // saffron — distinct from the orange accent
  supportError:   "#C8442E", // burnt red
  supportInfo:    "#3B5568", // slate — links + info
} as const;

// ── Liquid-glass surface constants (light — shared with glass.scss) ──────────
// Translucent white with a soft blur; near-flat shadow so cards read as clean
// hyper-minimal panels rather than heavy floating glass.
const GLASS_FILL   = "rgba(255, 255, 255, 0.72)";
const GLASS_BORDER = "1px solid rgba(20, 21, 23, 0.08)";
const GLASS_BLUR   = "blur(12px) saturate(1.06)";
const GLASS_SHADOW = "0 1px 2px rgba(20, 21, 23, 0.05)";
// Pop-over surfaces (menus, dialogs, app bar) sit over content, so they use a
// near-opaque white fill for crisp legibility.
const POP_FILL     = "rgba(255, 255, 255, 0.96)";

export const muiTheme = createTheme({
  shape: { borderRadius: 0 },
  palette: {
    mode: "light",
    // Radiant Orange is the signature accent; it carries WHITE text (fills/CTAs).
    primary:   { main: CDS.accent, dark: CDS.accentDark, contrastText: CDS.onAccent },
    secondary: { main: CDS.accentDark, contrastText: CDS.onAccent },
    error:     { main: CDS.supportError },
    warning:   { main: CDS.supportWarning },
    success:   { main: CDS.supportSuccess },
    info:      { main: CDS.supportInfo },
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
            color: CDS.onAccent,
            backgroundColor: CDS.accent,
            "&:hover": { backgroundColor: CDS.accentDark },
          }),
          ...(ownerState.color === "primary" && ownerState.variant === "text" && {
            color: CDS.ink,
            "&:hover": { backgroundColor: CDS.hoverSoft },
          }),
          ...(ownerState.color === "primary" && ownerState.variant === "outlined" && {
            color: CDS.ink,
            borderColor: CDS.accent,
            "&:hover": { borderColor: CDS.accentDark, backgroundColor: "rgba(255,79,24,0.10)" },
          }),
        }),
      },
    },
    // Links use a readable slate, never the orange accent (which is a fill only).
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: { root: { color: CDS.supportInfo } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 0 },
        colorPrimary: { backgroundColor: CDS.accent, color: CDS.onAccent },
      },
    },
    // Tabs: orange indicator, but the selected label stays ink (not orange).
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: CDS.accent, height: 3 } },
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
        root: { borderColor: "rgba(20, 21, 23, 0.08)" },
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
          backgroundColor: "#141517",
          color: "#FFFFFF",
          border: "1px solid rgba(20, 21, 23, 0.20)",
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
          "--DataGrid-rowBorderColor": "rgba(20,21,23,0.07)",
        },
        columnHeaders: { backgroundColor: "rgba(231,234,240,0.7)" },
        columnHeader: { backgroundColor: "transparent" },
        // Tiny uppercase eyebrow headers — the MP025 hyper-minimal table idiom.
        columnHeaderTitle: {
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: CDS.textSecondary,
        },
        cell: { borderColor: "rgba(20,21,23,0.07)" },
        footerContainer: { borderColor: "rgba(20,21,23,0.08)" },
        // Mint hover, yellow-wash selection (the signature accent).
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

export default muiTheme;
