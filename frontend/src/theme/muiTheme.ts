/**
 * AORMS Material UI theme — the single source of colour + shape for the migrated
 * app (workspace, panels and all portals). The **landing page stays on Carbon**
 * and never mounts these components.
 *
 * Three hard rules from the migration brief, encoded here so screens inherit them
 * for free and never re-specify them inline:
 *
 *  1. COLOURS ARE UNCHANGED. Every value below is a Carbon **g100** design-token
 *     value, lifted verbatim from `@carbon/themes` (see the block comment on each
 *     line). The dark "liquid glass" surface *is* the g100 theme — the office
 *     workspace already renders g100, so nothing shifts hue.
 *  2. SQUARE CORNERS EVERYWHERE. `shape.borderRadius = 0` plus explicit
 *     `borderRadius: 0` on every surface/control component. No rounded corners.
 *  3. LIQUID GLASS. Paper/Card/Drawer/AppBar/Menu surfaces are translucent with a
 *     backdrop blur, matching landing.scss / glass.scss — frosted panels over the
 *     dark ambient backdrop the app shell paints.
 *
 * This file (and everything under src/theme/) is the ONE place raw colour values
 * live — it is exempt from the visual guard exactly like landing.scss.
 */
import { createTheme } from "@mui/material/styles";

// ── Carbon g100 tokens (verbatim from @carbon/themes) ────────────────────────
const CDS = {
  background:     "#161616", // $background
  layer01:        "#262626", // $layer-01
  layer02:        "#393939", // $layer-02
  borderSubtle:   "#525252", // $border-subtle-01
  borderStrong:   "#6f6f6f", // $border-strong-01
  textPrimary:    "#f4f4f4", // $text-primary
  textSecondary:  "#c6c6c6", // $text-secondary
  textHelper:     "#a8a8a8", // $text-helper
  textOnColor:    "#ffffff", // $text-on-color
  interactive:    "#4589ff", // $interactive
  linkPrimary:    "#78a9ff", // $link-primary
  supportSuccess: "#42be65", // $support-success
  supportWarning: "#f1c21b", // $support-warning
  supportError:   "#fa4d56", // $support-error
  supportInfo:    "#4589ff", // $support-info
} as const;

// ── Liquid-glass surface constants (shared with glass.scss) ──────────────────
const GLASS_FILL   = "rgba(255, 255, 255, 0.045)";
const GLASS_BORDER = "1px solid rgba(255, 255, 255, 0.10)";
const GLASS_BLUR   = "blur(14px) saturate(1.12)";
const GLASS_SHADOW = "0 8px 24px rgba(0, 0, 0, 0.28)";
// Pop-over surfaces (menus, dialogs, app bar) sit over content, so they use a
// darker frosted fill for legibility rather than the near-clear tile fill.
const POP_FILL     = "rgba(22, 22, 22, 0.92)";

export const muiTheme = createTheme({
  shape: { borderRadius: 0 },
  palette: {
    mode: "dark",
    primary:   { main: CDS.interactive, contrastText: CDS.textOnColor },
    secondary: { main: CDS.linkPrimary, contrastText: CDS.textOnColor },
    error:     { main: CDS.supportError },
    warning:   { main: CDS.supportWarning },
    success:   { main: CDS.supportSuccess },
    info:      { main: CDS.supportInfo },
    background: { default: CDS.background, paper: CDS.layer01 },
    text: {
      primary:   CDS.textPrimary,
      secondary: CDS.textSecondary,
      disabled:  CDS.borderStrong,
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  typography: {
    // Brand font — Google Sans across the whole product (mirrors --esti-font-sans
    // and the Carbon runtime font override in styles.scss). Falls back to Plex Sans.
    fontFamily:
      "'Google Sans', 'Google Sans Text', 'Product Sans', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
    button: { textTransform: "none", fontWeight: 400 },
  },
  components: {
    // Tiles / cards — the frosted-glass panel.
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
          boxShadow: `0 1px 0 rgba(255,255,255,0.05) inset, ${GLASS_SHADOW}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    // Pop surfaces — darker frosted fill for readability over content.
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
    // Controls — all square.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 0 } },
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
        root: { borderColor: "rgba(255, 255, 255, 0.10)" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 0, backgroundColor: POP_FILL, border: GLASS_BORDER },
      },
    },
  },
});

export default muiTheme;
