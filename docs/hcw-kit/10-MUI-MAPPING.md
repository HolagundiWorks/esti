# MUI → HCW mapping

**Every MUI component in use, mapped to its HCW treatment.** MUI is the rendering
engine; HCW owns the appearance and the pattern (Constitution I). Inventory source:
distinct `@mui/material` imports across `frontend/src` (60 as of 2026-07-11 — keep
current via the MUI Specialist role).

**Treatment legend** — 🟦 **HCW primitive** (import from `@hcw/ui-kit`) ·
🟩 **themed** (use the MUI name; appearance fully owned by `createAormsTheme`) ·
⬜ **neutral** (layout/typography plumbing; sanctioned direct use) ·
🟥 **restricted** (use the HCW pattern instead) · 🟨 **gap** (not yet governed).

## Actions
| MUI | Treatment | HCW form |
| --- | --- | --- |
| Button | 🟩 themed | flat → glass-hover CTA; danger via `color="error"`; page-level CTAs go to **ActionDock** (`useScreenActions`), never inline |
| IconButton | 🟩 themed | ≥44px in persistent chrome (`chromeIconSx`) |
| ToggleButton/Group | 🟩 themed | selected = accent wash |
| Fab / SpeedDial | 🟥 restricted | use ActionDock — no floating action buttons |

## Surfaces & structure
| MUI | Treatment | HCW form |
| --- | --- | --- |
| Paper / Card / CardActionArea | 🟩 themed (flat, square) | for lifted objects use 🟦 `Surface layer="soft|glass"` |
| Accordion (+Summary/Details) | 🟩 themed | hairline dividers, no boxes |
| Drawer | 🟩 themed | solid pop fill + hairline |
| AppBar | 🟩 themed | ribbon chrome (`AppRibbon` app shell) |
| Divider | ⬜ neutral | hairline via theme divider colour |
| Box / Stack / Grid / Container | ⬜ neutral | layout plumbing; spacing via theme grid only |

## Inputs
| MUI | Treatment | HCW form |
| --- | --- | --- |
| TextField / OutlinedInput / FilledInput | 🟩 themed | neumorphic recessed wells (`NEU_INSET` recipes) |
| Select / Autocomplete / MenuItem | 🟩 themed | DD_FLAT rest → button-like hover |
| Checkbox / Radio / Switch / Slider | 🟩 themed (0.1.0) | accent-active, FOCUS_RING |
| InputAdornment / FormControlLabel / FormControl | ⬜ neutral | — |
| DatePicker (X) | 🟨 gap | inherits input theming; calendar popup unaudited |

## Data display
| MUI | Treatment | HCW form |
| --- | --- | --- |
| Table family | 🟩 themed | structural headers, hairline rows |
| DataGrid (X) | 🟩 themed | transparent chrome, accent selection |
| Chip | 🟩 themed (square) | **status is never a filled Chip** → 🟦 `StatusDot`/app `StatusTag` |
| Avatar | 🟥 restricted | 🟦 kit `Avatar` (injected colour) / app `StaffAvatar` |
| Badge | 🟩 themed | accent primary |
| Tooltip | 🟩 themed | ink slab, square |
| Typography | ⬜ neutral | variants only; micro-type via `TYPE_SCALE` |
| List family | 🟩 themed | selected = layer02 wash |
| Charts (X) | 🟨 gap | last app-level canonical outside governance |

## Feedback
| MUI | Treatment | HCW form |
| --- | --- | --- |
| Alert / AlertTitle | 🟩 themed | error/warning = tinted glass (Layer 3); info/success quiet |
| Snackbar | 🟥 restricted | 🟦 kit `ToastHost` + `pushToast` |
| Dialog family | 🟩 themed (NEU_POP) | confirm-destroy via 🟦 `ConfirmModal`; must carry `aria-labelledby` |
| CircularProgress / LinearProgress / Skeleton | 🟩 themed (0.1.0) | loading grammar via 🟦 `DataState` |
| Backdrop / Modal (raw) | 🟥 restricted | Dialog only |

## Navigation
| MUI | Treatment | HCW form |
| --- | --- | --- |
| Tabs / Tab | 🟩 themed | transparent + inset top alert line |
| Menu / Popover | 🟩 themed (FLAT_POP) | keyboard contract per AppRibbon pattern |
| Breadcrumbs | 🟥 restricted | 🟦 kit `PageBreadcrumb` (linkComponent injection) |
| Link | 🟩 themed | slate, never accent |
| Pagination / Stepper | 🟨 gap | unthemed; govern before first heavy use |

## HCW-only primitives (no MUI counterpart)
`Surface` · `GlassRail` · `ActionDock`/`useScreenActions` · `SectionDock` ·
`TaskbarFooter` · `HealthGlassOrb` · `BrandMark` · `StatusDot` · `DataState` ·
`ConfirmModal` · `PageBreadcrumb` · `ToastHost` · `Avatar`.

## Rule

A 🟥 usage or an un-themed 🟨 in new code is a compliance defect (register it).
When a 🟨 pattern is first needed seriously, it is governed (themed or wrapped)
**before** the feature ships — Constitution VI.
