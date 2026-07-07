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
 *  2. ONE SOFT-SQUARE RADIUS EVERYWHERE. `shape.borderRadius = GLASS_RADIUS` (8)
 *     — every popup, panel, button, input and control shares the same gentle
 *     rounding so the whole product reads as one system (2026-07 direction).
 *  3. LIQUID GLASS pop-overs + GLASS BUTTONS. Menus/Dialogs/Popovers/Autocomplete
 *     panes are translucent frosted glass (blur + hairline highlight + soft ambient
 *     shadow, `GLASS_PANE`). Every button is a white liquid-glass slab whose hover
 *     floods orange-30% and whose active/pressed label turns orange (`GLASS_BTN_*`).
 *     Content tiles (Paper/Card/DataGrid) stay FLAT on the canvas so tables stay
 *     legible; the glass lives on the things that float and the things you press.
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

// ── Shared corner radius — the single "soft-square" rounding used EVERYWHERE ──
// Every popup, panel, button, input and control shares this one radius so the
// whole product (landing → apps → login → admin → ESE) reads as one system.
const GLASS_RADIUS = 8;

// ── Content-surface constants (light) — tiles/cards stay FLAT on the canvas ──
// Content Paper/Card/DataGrid read directly on the Fog-Gray canvas with hairline
// dividers (definition from spacing, not a box edge). Only POP-UP panes and
// buttons wear the liquid glass; content tiles stay flat so tables stay legible.
const GLASS_BORDER = "1px solid rgba(20, 21, 23, 0.08)"; // hairline edge
const GLASS_BLUR   = "none";                           // flat content — no backdrop blur
const GLASS_SHADOW = "none";                           // flat content — no elevation
// Edge-docked surfaces (drawer, app bar) sit over content — solid white.
const POP_FILL     = "#FFFFFF";

// ── LIQUID GLASS pop-over panes (menus, dialogs, popovers, autocomplete) ──────
// The shared "liquid glass" look for every floating pane: a translucent frosted
// white surface, a backdrop blur, a bright hairline highlight edge and a soft
// ambient drop shadow. One recipe across the whole product.
const GLASS_PANE_FILL   = "rgba(255, 255, 255, 0.74)";
const GLASS_PANE_BLUR   = "blur(22px) saturate(1.7)";
const GLASS_PANE_BORDER = "1px solid rgba(255, 255, 255, 0.6)";
const GLASS_PANE_SHADOW =
  "0 10px 34px rgba(20, 21, 23, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7)";
const GLASS_PANE = {
  backgroundColor: GLASS_PANE_FILL,
  backgroundImage: "none",
  backdropFilter: GLASS_PANE_BLUR,
  WebkitBackdropFilter: GLASS_PANE_BLUR,
  border: GLASS_PANE_BORDER,
  borderRadius: GLASS_RADIUS,
  boxShadow: GLASS_PANE_SHADOW,
} as const;

// ── RAISED GLASS BUTTONS — the signature control (see reference image) ────────
// A clean, OPAQUE raised-white pill: a whisper-soft top→bottom gradient, a bright
// top-edge highlight, a crisp diffuse ambient drop shadow and a hairline rim — the
// classic soft-UI "liquid glass" button. NO backdrop blur / translucency (that is
// what made the old buttons read as frosted glass with mottled gradations). Hover
// warms the whole slab to Radiant Orange; pressed inverts to a carved well and the
// label turns orange. Applied to every variant so all buttons read as one family.
const GLASS_BTN_BG =
  "linear-gradient(180deg, #ffffff 0%, #eef1f4 100%)";
const GLASS_BTN_BORDER = "1px solid rgba(255, 255, 255, 0.9)";
// Ambient float + tight contact shadow + hairline rim + inner top highlight.
const GLASS_BTN_SHADOW =
  "0 10px 22px rgba(20, 21, 23, 0.13), 0 2px 5px rgba(20, 21, 23, 0.08), 0 0 0 1px rgba(20, 21, 23, 0.035), inset 0 1px 1px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(20, 21, 23, 0.05)";
// Hover — a light Radiant-Orange wash at 30% (translucent, still clean/no frost).
const GLASS_BTN_SHADOW_HOVER =
  "0 12px 24px rgba(255, 79, 24, 0.24), 0 2px 6px rgba(255, 79, 24, 0.16), 0 0 0 1px rgba(255, 79, 24, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.7)";
// Pressed / active — carved well (inverted), label turns orange.
const GLASS_BTN_BG_PRESSED =
  "linear-gradient(180deg, #eef1f4 0%, #ffffff 100%)";
const GLASS_BTN_PRESSED =
  "inset 2px 2px 6px rgba(20, 21, 23, 0.16), inset -2px -2px 6px rgba(255, 255, 255, 0.9), 0 0 0 1px rgba(20, 21, 23, 0.04)";
// Error hover flood (kept translucent-red is fine — small surface).
const GLASS_RED_28 = "rgba(200, 68, 46, 0.28)";
// Orange translucent wash — selected toggle buttons.
const GLASS_ORANGE_30 = "rgba(255, 79, 24, 0.30)";

// ── Neumorphic RECESSED inputs (soft UI) — every text-entry field ────────────
// Text inputs (search + all TextField/Select/DatePicker) look carved INTO the
// surface instead of sitting in a bordered box: a same-colour fill with a dark
// inner shadow top-left + a light inner highlight bottom-right (the classic inset
// look), no border, soft rounded corners. Shares the neu palette with glass.scss.
const NEU_FILL        = "#eceef2"; // soft base, a touch off the Fog-Gray canvas
// Depth reduced ~50% (shallower well): offsets/blur halved from the original 4px/9px.
const NEU_INSET       = "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92)";
// On focus, a touch deeper + a thin Radiant-Orange inner ring for affordance.
const NEU_INSET_FOCUS = "inset 2.5px 2.5px 5.5px rgba(20, 21, 23, 0.20), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.95), inset 0 0 0 1.5px rgba(255, 79, 24, 0.45)";
const NEU_INSET_ERROR = "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92), inset 0 0 0 1.5px rgba(200, 68, 46, 0.55)";
const NEU_INPUT_RADIUS = GLASS_RADIUS; // shared soft-square rounding.

// Dropdowns (Select) are FLAT — a plain white field with a hairline border and
// the default caret — NOT neumorphic (text inputs keep the recessed well).
const DD_FILL   = "#ffffff";
const DD_BORDER = "1px solid rgba(20, 21, 23, 0.18)";
const DD_FLAT = {
  backgroundColor: DD_FILL,
  boxShadow: "none",
  border: DD_BORDER,
  "&:hover": { backgroundColor: DD_FILL, borderColor: "rgba(20, 21, 23, 0.32)" },
  "&.Mui-focused": { border: "1px solid #ff4f18", boxShadow: "none" },
  "&.Mui-error": { borderColor: "rgba(200, 68, 46, 0.7)" },
  "&.Mui-disabled": { boxShadow: "none", opacity: 0.6 },
} as const;

export const muiTheme = createTheme({
  shape: { borderRadius: GLASS_RADIUS },
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
    // Brand font — Urbanist (OFL, self-hosted via @fontsource) across the whole
    // product; mirrors --esti-font-sans and the Carbon runtime override in styles.scss.
    fontFamily:
      "'Urbanist', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    // CTA buttons read in Title Case.
    button: { textTransform: "capitalize", fontWeight: 600 },
    // HEADINGS are ALL CAPS (h1–h4 — the display + page/section headings). Titles
    // and subtitles (h5/h6/subtitle1/subtitle2) stay Title Case — see below.
    h1: { fontWeight: 300, letterSpacing: "0.01em", textTransform: "uppercase" },
    h2: { fontWeight: 300, letterSpacing: "0.01em", textTransform: "uppercase" },
    h3: { fontWeight: 400, letterSpacing: "0.01em", textTransform: "uppercase" },
    h4: { fontWeight: 500, letterSpacing: "0.01em", textTransform: "uppercase" },
    // Titles / subtitles — Title Case (never uppercased).
    h5: { fontWeight: 600, textTransform: "none" },
    h6: { fontWeight: 600, textTransform: "none" },
    subtitle1: { textTransform: "none" },
    subtitle2: { textTransform: "none" },
    overline: { letterSpacing: "0.08em", fontWeight: 600 },
  },
  components: {
    // Tiles / cards — FLAT: a plain Pure-White surface with NO border and NO
    // shadow (definition comes from spacing / hairline dividers, not a box edge).
    // Pop surfaces (Dialog/Menu/Drawer/AppBar) re-add their own border below.
    MuiPaper: {
      defaultProps: { elevation: 0, square: true },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          // Fill with the CANVAS colour so content Paper blends into the page (no
          // white box), while every Paper stays opaque (floating poppers stay
          // readable). Pop surfaces (Dialog/Menu/Drawer/AppBar) re-set solid white below.
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
      styleOverrides: { root: { backgroundColor: CDS.background, border: "none", boxShadow: "none", borderRadius: GLASS_RADIUS } },
    },
    // Accordions — FLAT: transparent, no shadow, no rounded corners, and the MUI
    // divider pseudo-line removed; a single hairline separates stacked panels.
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
    MuiAccordionSummary: {
      styleOverrides: { root: { paddingInline: 0 } },
    },
    MuiAccordionDetails: {
      styleOverrides: { root: { paddingInline: 0 } },
    },
    // Pop surfaces — LIQUID GLASS panes (anything that pops up: dialogs, menus,
    // dropdowns, popovers). Translucent frosted white, backdrop blur, hairline
    // highlight edge, soft ambient shadow. One shared recipe (GLASS_PANE).
    MuiMenu: {
      styleOverrides: { paper: { ...GLASS_PANE } },
    },
    MuiPopover: {
      styleOverrides: { paper: { ...GLASS_PANE } },
    },
    MuiDialog: {
      styleOverrides: { paper: { ...GLASS_PANE } },
    },
    // Drawer is an edge-docked panel (not a floating card) — keep it flat white.
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
    // Controls — GLASS BUTTONS. Every button (all variants) is a white liquid-
    // glass slab: soft specular gradient, hairline highlight, ambient shadow,
    // 8px corners. Hover floods it with Radiant-Orange translucent glass at 30%
    // and turns the label deep orange; the pressed / active state turns the
    // label orange over a pressed (inset) glass. Error keeps a red label.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => {
          const isError = ownerState.color === "error";
          // CTAs (contained buttons) carry ORANGE label text by default.
          const isCta = ownerState.variant === "contained";
          const baseInk = isError ? CDS.supportError : isCta ? CDS.accent : CDS.ink;
          const activeInk = isError ? CDS.supportError : CDS.accent;
          return {
            borderRadius: GLASS_RADIUS,
            fontWeight: 600,
            textTransform: "capitalize", // Title Case
            color: baseInk,
            background: GLASS_BTN_BG,
            border: GLASS_BTN_BORDER,
            boxShadow: GLASS_BTN_SHADOW,
            transition:
              "background 140ms ease, color 140ms ease, box-shadow 140ms ease",
            "&:hover": {
              // Light orange wash at 30% (translucent, clean — no frost); label
              // turns deep orange. Error keeps a red label over a light-red wash.
              color: isError ? CDS.supportError : CDS.accentDark,
              background: isError ? GLASS_RED_28 : GLASS_ORANGE_30,
              border: GLASS_BTN_BORDER,
              boxShadow: GLASS_BTN_SHADOW_HOVER,
            },
            // Pressed and "active" (selected / aria-pressed) → carved well, orange label.
            "&:active": {
              color: activeInk,
              background: GLASS_BTN_BG_PRESSED,
              boxShadow: GLASS_BTN_PRESSED,
            },
            '&.Mui-selected, &[aria-pressed="true"], &.is-active': {
              color: activeInk,
              background: GLASS_BTN_BG_PRESSED,
              boxShadow: GLASS_BTN_PRESSED,
            },
            "&.Mui-disabled": {
              color: CDS.textHelper,
              background: GLASS_BTN_BG,
              boxShadow: GLASS_BTN_SHADOW,
              opacity: 0.55,
            },
          };
        },
      },
    },
    // Links use a readable slate, never the orange accent (which is a fill only).
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
    // Tabs: orange indicator AND the active (selected) label turns orange.
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: CDS.accent, height: 3 } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", "&.Mui-selected": { color: CDS.accent, fontWeight: 600 } },
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
    // Inputs default to the COMPACT size (the fields were too tall) — dense
    // padding across TextField/Select/Autocomplete/pickers everywhere.
    MuiTextField: { defaultProps: { size: "small" } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiAutocomplete: {
      defaultProps: { size: "small" },
      styleOverrides: { paper: { ...GLASS_PANE } },
    },
    // Text inputs — RECESSED neumorphic well (not a bordered box).
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: NEU_INPUT_RADIUS,
          backgroundColor: NEU_FILL,
          boxShadow: NEU_INSET,
          // Kill the outlined border in every state — the inset shadow is the frame.
          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          "&:hover .MuiOutlinedInput-notchedOutline": { border: "none" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "none" },
          "&.Mui-focused": { boxShadow: NEU_INSET_FOCUS },
          "&.Mui-error": { boxShadow: NEU_INSET_ERROR },
          "&.Mui-disabled": { boxShadow: NEU_INSET, opacity: 0.6 },
          // Dropdowns are FLAT — a plain white field with a hairline border and
          // the default caret, not neumorphic like the recessed text wells.
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
          "&:before": { display: "none" }, // drop the filled underline
          "&:after": { display: "none" },
          "&:hover": { backgroundColor: NEU_FILL },
          "&.Mui-focused": { backgroundColor: NEU_FILL, boxShadow: NEU_INSET_FOCUS },
          "&.Mui-error": { boxShadow: NEU_INSET_ERROR },
          // Dropdowns are FLAT — hairline border + default caret, not neumorphic.
          "&:has(.MuiSelect-select)": { ...DD_FLAT },
        },
      },
    },
    // Toggle buttons — glass family; the selected ("active") one gets orange ink.
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
          borderRadius: GLASS_RADIUS,
          backgroundColor: "#141517",
          color: "#FFFFFF",
          border: "1px solid rgba(20, 21, 23, 0.20)",
        },
      },
    },
    // MUI X DataGrid — FLAT: no surface fill, no outer border; the table reads
    // directly on the canvas with hairline row rules (the dashboard idiom, now the
    // standard everywhere). Replaces Carbon DataTable.
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
        // Tiny uppercase eyebrow headers — the hyper-minimal table idiom.
        columnHeaderTitle: {
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: CDS.textSecondary,
        },
        cell: { borderColor: "rgba(20,21,23,0.07)" },
        footerContainer: { borderColor: "rgba(20,21,23,0.08)" },
        // Neutral hover, orange-wash selection (the signature accent).
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
