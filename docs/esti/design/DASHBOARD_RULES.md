# DASHBOARD RULES — ESTI AORMS Command Center

Fixed rules for the dashboard screen (frontend/src/routes/Dashboard.tsx). These rules govern the layout, colour system, and data structure of the office command center. Do not change these without updating this document.

---

## Layout Architecture

The Dashboard uses a non-standard layout for the office command center role:

- Outer container: `style={{ width: "80%", margin: "0 auto" }}` — intentional centring for wide monitors
- No max-width constraint is currently applied — a max of 1600px should be added in a future polish sprint
- The layout is vertical: telemetry strip at top, then tabs + tab panels below filling the remaining viewport

This 80% width centred layout is a deliberate product decision and must not be changed to a full-width Carbon Grid layout.

---

## Telemetry Strip — 4 Tiles in a Row

The telemetry strip is rendered by the `TelemetrySidebar` component and appears above the tabs on every tab panel.

**Rules:**
- Always 4 tiles, never more, never fewer
- Tiles are: CLIENT, FINANCE, PROJECT, TEAM (in this order, left to right)
- Each tile has a `border-top: 2px solid` in the zone identity colour
- Each tile contains: zone label (identity colour), circular SVG gauge, percentage value (alert colour)
- The gauge is a custom SVG (not a Carbon component) — a future improvement would replace it with MeterChart, but the SVG is currently acceptable
- Tile state classes: `esti-telem-tile` base, `esti-telem-tile--critical` modifier when state is critical (adds pulsing border or background)
- Tiles must not be clickable — they are ambient awareness only, not navigation

**Identity colours per tile (border-top only):**
```
CLIENT:  #0f62fe  (Carbon Blue 60)
FINANCE: #6929c4  (Carbon Purple 70)
PROJECT: #009d9a  (Carbon Teal 50)
TEAM:    #1192e8  (Carbon Cyan 40)
```

---

## Alert Colour System

The alert system uses four operational states plus inactive. These colours are defined in `ZCOLOR` in Dashboard.tsx and drive all state-dependent colouring across all dashboard components.

| State | Colour | Hex | Meaning |
|---|---|---|---|
| stable | alert-stable | #42be65 | Practice operating normally |
| watch | alert-watch | #f1c21b | Elevated — monitor for escalation |
| friction | alert-friction | #ff832b | Degraded — act before end of day |
| critical | alert-critical | #fa4d56 | Intervention required immediately |
| inactive | inactive | #6f6f6f | Module disabled or no data |

**Alert colour usage rules:**
- Alert colours appear ONLY on: gauge ring stroke, percentage value text, zone status badge background (MacroHdr), quad cell state decoration, attention vector chain colour, approval row accent
- Alert colours must NOT appear on: backgrounds, borders of containers, text content other than direct state indicators
- The status badge in MacroHdr uses `background: ZCOLOR[state], color: "#161616"` — the #161616 should be replaced with `var(--cds-background)` in a future fix (P2 violation noted)

---

## Macro Zone Grid — 2x2 Layout

The OVERVIEW tab shows a 2x2 grid of macro zones rendered by `ScreenOverview`. Each zone covers one operational domain.

**Rules:**
- Always 2 columns, 2 rows — four zones: CLIENT SIGNALS, FINANCIAL HEALTH, PROJECT HEALTH, TEAM LOAD
- Zone order: CLIENT top-left, FINANCE top-right, PROJECT bottom-left, TEAM bottom-right
- Zone container class: `esti-macro-zone`
- Zone header: `MacroHdr` component — zone name in white, status label in alert-colour background badge
- No background fill on zone containers — zones are separated by grid gap only
- Each zone has a fixed identity top border matching its telemetry tile colour

---

## Quad Cell System — 2x2 per Zone

Each macro zone contains a `QuadCell` 2x2 grid (four data cells).

**Rules:**
- Always 4 cells per zone — each cell shows one metric
- Cell structure: name label (uppercase, secondary text colour), value (white/alert colour), sub-text (grey), optional note
- Cell class: `esti-qcell esti-qcell--{state}`
- Values display in white unless the state is non-stable (then alert colour)
- Sub-text renders at label-01 size in text-secondary colour with no background
- No cell is clickable — quad cells are read-only signal displays

**Fixed cell names per zone:**
```
CLIENT:  APPROVALS | RESPONSE LAG | REVISIONS | BLOCKED
FINANCE: OUTSTANDING | OVERDUE 30D+ | READY BILL | GST
PROJECT: AT RISK | DELAYED | DRAWINGS | SITE DELAY
TEAM:    PRESENT | LEAVE | OVERLOAD | WFH
```

---

## Tab Structure — 8 Tabs

The Dashboard TabList always has exactly 8 tabs. Do not add, remove, or reorder tabs without updating this document.

| Index | Tab label | Screen component | Permission gate |
|---|---|---|---|
| 0 | OVERVIEW | ScreenOverview | None (all staff) |
| 1 | PROJECTS | ScreenProjects | None |
| 2 | FINANCE | ScreenFinance | invoice:manage (disabled if lacking) |
| 3 | TEAM | ScreenTeam | hrEnabled setting (disabled if off) |
| 4 | APPROVALS | ScreenApprovals | None |
| 5 | AI INSIGHTS | ScreenAI | None (fees:manage gates AI panel inside) |
| 6 | REPORTS | Placeholder | None |
| 7 | ACTIVITY | Placeholder | None |

Tabs 6 and 7 currently show a placeholder — this is intentional pending implementation. The Tab component renders but is not disabled.

**Tab styling:** plain `Tabs` with `TabList` (no `contained` prop) — the dashboard uses the default Carbon tab variant, not the contained variant used on other screens.

---

## Attention Vector Strip

The `AlertStrip` component renders above the TabList. It is a single horizontal strip showing:
1. Shape symbol (●▲◆■) in alert colour
2. Issue description text
3. Action arrow and recommended action text
4. HEALTH score and band label in alert colour

**Rules:**
- Single line — no line wrapping intended
- The strip derives state from `deriveAttn()` which reads all four zone states and identifies the most critical causal chain
- The chain shows which zones are linked (CLIENT → PROJECTS → FINANCE cascade)
- Strip class: `esti-av-strip` — this class is used in Dashboard.tsx but must be defined in styles.scss

---

## State Derivation Rules

These rules are encoded in Dashboard.tsx and must not be changed without product review:

| Zone | Stable | Watch | Friction | Critical |
|---|---|---|---|---|
| CLIENT | 0 pending approvals | any pending | 3+ pending or 7d+ wait | 5+ pending or 14d+ wait |
| FINANCE | 0 outstanding | any overdue or >5M outstanding | >1M overdue or >20M outstanding | >5M overdue |
| PROJECT | 0 at risk | 1 at risk | 2 at risk | 3+ at risk |
| TEAM | 0 overloaded | 1 overloaded | 2+ overloaded | half-team overloaded |

Health score is 0–100 derived from weighted zone penalties: CLIENT 25%, FINANCE 30%, PROJECT 25%, TEAM 20%.

Health bands:
- 88–100: STABLE (#42be65)
- 72–87: OPERATIONAL (#42be65)
- 55–71: ELEVATED STRESS (#f1c21b)
- 38–54: FRICTION (#ff832b)
- 0–37: INTERVENTION REQUIRED (#fa4d56)