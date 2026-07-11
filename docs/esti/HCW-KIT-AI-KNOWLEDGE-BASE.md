# HCW Kit — AI Knowledge Base

**Status:** Canonical for AI agents · **Owner:** Human Centric Works (HCW) · **Adopted:** 2026-07-11

This document is the operating knowledge base for any AI agent auditing, maintaining,
or extending the **HCW Design System** (`@hcw/ui-kit`). The agent acts as a combined
**Design System Architect · UX Lead · Accessibility Specialist · Front-End Architect**.

> **Authority order:** HCW Kit is the **single source of truth**. Material UI is the
> **implementation framework only** — never the design authority. External systems
> (Carbon, Material 3, Fluent 2, Atlassian, Polaris, Primer) are references, never
> precedent. Where HCW and a reference disagree, **HCW wins**.

Companion docs — read together, in this order:

| Doc | Role |
| --- | --- |
| [HCW-UI-KIT.md](HCW-UI-KIT.md) | *How* — tokens, layers, components, SCSS |
| [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) | *Why* — UX laws, spatial roles, a11y, review checklist |
| **This document** | *Agent contract* — skills, rulesets, enforcement, audit recipes |
| [NAVIGATION.md](NAVIGATION.md) | *Where* — canonical IA |

---

## 1. The system in one paragraph (agent priming)

HCW-UI-Kit is a **token + MUI-theme + primitives** system, not a bespoke component
library. Its thesis — **depth encodes importance** — stacks three material languages:
FLAT (info at rest, ~90% of pixels), SOFT/neumorphic (objects you work within), GLASS
(actions/alerts that want you now). One accent (Radiant Orange `#FF4F18`, fills/CTAs
only — links are slate). Surfaces are **square** (`RADIUS 0`); only buttons (4px),
dialogs (8px) and the ActionDock capsule are rounded. One spatial model everywhere:
**Rail (20%, glass) · Stage (80%, scrolls) · Taskbar footer · ActionDock**
(LEFT destroy · CENTER create · RIGHT commit). `:focus-visible` receives the same
Layer-3 glass lift as `:hover` — keyboard parity is a brand behaviour, not a patch.

**Package layout** (`packages/hcw-ui-kit/src/`): `tokens.ts` (all raw values — colour,
radius, type, **scales**: `SPACING`, `BREAKPOINTS`, `Z_INDEX`, `OPACITY`, `MOTION`,
`ELEVATION`, plus layer recipes), `theme.ts` (`createAormsTheme()` — every MUI override),
`chrome-sx.ts`, and primitives `Surface`, `GlassRail`, `ActionDock` (+`useScreenActions`),
`TaskbarFooter`, `SectionDock`, `HealthGlassOrb`, `BrandMark`, `MuiRoot`.

---

## 2. Rulesets (enforced, with detection recipes)

Each rule states the check an agent runs. Violations are findings; fixes go **kit-first**
(change the kit once; consumers inherit).

### R1 — Token-driven visuals
Raw colour/shape/motion values live **only** in `tokens.ts` (and the two documented
SCSS exception files: `glass.scss`, `landing.scss`; `styles.scss`'s `--cds-*` block is
a frozen compat layer — never extend it).
- Detect: `rg -n '#[0-9a-fA-F]{3,6}\b' frontend/src -g '*.tsx'` — allow only canvas/SVG
  data-viz palettes (flag for token migration) and brand-mandated colours (Google).
- Detect: `rg -n 'fontSize:' frontend/src -g '*.tsx'` — inline font sizes are violations
  **except**: (a) `fontSize` on ICON components (`<ExpandMore sx={{ fontSize: 16 }}/>`,
  `fontSize="small"`) — that is geometry, not typography; (b) deliberate miniature
  mock UIs (`StudioIntelligenceHeroMock`) where scaled-down text is the point.
  Real text sizes come from theme variants or the kit `TYPE_SCALE` token.
- Detect: `rg -n 'var\(--cds-' frontend/src -g '*.tsx'` — **new code only.** Existing
  `--cds-*` call sites are a CLAUDE.md-sanctioned frozen compat layer (the
  `ZCOLOR`/`TILE_COLOR` data-driven maps are explicitly permitted — do not "migrate"
  them wholesale). The rule is: never ADD `--cds-*` usage; prefer kit tokens
  (`STATUS_COLORS`, `colors`, `TYPE_SCALE`) when touching a call site anyway.

### R2 — Component-first, no duplicates
One canonical implementation per pattern. Status = `StatusTag`/`StatusDot`. Skeleton/empty
= `DataState`. Confirm-destroy = `ConfirmModal`. Layout = `RailLayout` / `GlassRail` /
`AuthRailLayout` / `PortalShell` / `ExternalPortalShell` / `MarketingShell` — never bespoke rails.
- Detect duplicates: `rg -n 'function TagChip|const chipSx' frontend/src`.
- New shared elements are added to the **kit first**, then consumed.

### R3 — MUI is implementation, HCW is authority
Every MUI component in app use must be **themed by the kit** (or wrapped). Un-themed MUI
defaults (rounded, blue, elevated) are design drift.
- Inventory: `rg -o "import \{[^}]*\} from '@mui/material'" -U frontend/src` → distinct list.
- Compare against `theme.ts` overrides; any used-but-un-themed component is a finding.

### R4 — Layer by role, never by taste
flat = information at rest · soft = contained objects · glass = actions/alerts only.
Glass is scarce (Von Restorff). No glass on dense cards/tiles. Marketing sub-cards stay flat.
- Detect: `backdrop-filter`/`layer="glass"` outside sanctioned chrome.

### R5 — Interaction contract
Page CTAs publish to the **ActionDock** via `useScreenActions` (publish `[]` while a
dialog is open). No inline page-level Save/Create duplicating the dock. Verbs are
Create/Save/Delete — never OK/Submit/Apply. Destroy confirms via `ConfirmModal`.

### R6 — Accessibility gate (WCAG 2.2 AA, mandatory)
Non-negotiables on every change: one `<main>` per shell + skip link; `FOCUS_RING` on
`:focus-visible`; ≥44px persistent-chrome targets; dialogs carry `aria-labelledby`;
nav carries `aria-current`; colour never the sole signal (shape-coded health orbs,
bordered selection); every animation gated by `REDUCE_MOTION`; inputs have programmatic
labels (no placeholder-as-label); `autoComplete` on identity/credential fields
(`new-password` when setting for others).

### R7 — Motion communicates state, not decoration
Durations/easings come from `MOTION` tokens (fast=130ms baseline). Every transform is
`REDUCE_MOTION`-gated. No decorative infinite animation ungated.

### R8 — Content design
Verb-first buttons; errors say *what failed + what to do next*; money = integer paise via
`formatINR`; dates en-IN; helper text via `helperText`/`esti-label--helper`. Tone:
plain, specific, honest (no fabricated stats — brand stance).

### R9 — Documentation sync
A kit change without a matching update to HCW-UI-KIT.md (and `/design-system` showcase
where visual) is incomplete. Docs and code diverging = a finding against the **change**,
not the docs.

---

## 3. Reference systems — what to borrow from whom

| System | Borrow | Ignore |
| --- | --- | --- |
| IBM Carbon | token governance, data-viz rules, enterprise density | its visual language (we left Carbon 2026-07) |
| Material 3 | motion/easing science, state-layer thinking | dynamic colour, rounded shape language |
| Fluent 2 | desktop/productivity patterns, keyboarding | acrylic/mica aesthetics |
| Atlassian | IA + governance process docs, RFC workflow | — |
| Polaris | UX writing + form/table content patterns | commerce-specific flows |
| Primer | component API docs style, a11y annotations | — |
| lawsofux.com / NN/g | the laws + heuristics themselves | — |
| designtokens.org | token tier naming (global → semantic → component) | — |

---

## 4. Agent skills → concrete behaviours

| Skill | What the agent actually does here |
| --- | --- |
| Design System Architect | owns `tokens.ts`/`theme.ts`; kit-first changes; keeps primitives minimal |
| Token Auditor | runs R1 greps; migrates magic numbers to scales |
| Theme Auditor | verifies every used MUI component has overrides; owns scheme parity (light default; dark/HC scaffolds) |
| Component Auditor | R2 duplicate hunts; promotes app-level canonicals into the kit |
| Consistency Auditor | cross-page sweep of layouts, states, spacing vs the shells |
| UX Auditor | Nielsen ×10 + UX-laws pass (see §5) with `file:line` evidence |
| Accessibility Auditor | R6 gate; axe-style static checks; keyboard path review |
| MUI Specialist | inventory + mapping; wraps only where theming can't reach |
| Information Architect | NAVIGATION.md conformance; menu depth ≤7±2; `aria-current`; `document.title` |
| Content Designer | R8 sweep |
| Interaction Designer | R5 dock contract; workflow friction maps |
| Responsive Auditor | breakpoint tokens only; rail stack at `md`; tables scroll in-container |
| Performance Auditor | bundle/`sideEffects`/backdrop-filter budget; skeleton coverage; optimistic-UI adoption |
| Documentation Reviewer | R9 sync check every PR |
| DesignOps Manager | versioning/changelog/deprecation once governance lands (roadmap) |

---

## 5. Audit recipes (how to run each deliverable)

Every audit: evidence = `file:line`; state "none found" rather than infer; fixes ranked
severity × reach × confidence; never edit `Projects.tsx`/`Clients.tsx` (parallel-WIP)
without instruction.

1. **Maturity audit** — score §Foundations/Tokens/Themes/Components/Patterns/A11y/DX/
   DesignerX/Governance/Perf/Docs 0–10 each → weighted 0–100 → level
   (Initial→Optimized). Last run 2026-07-11: **67/100, "Defined"**.
2. **Compliance audit** — run all R1–R9 detections app-wide; quantify per rule.
3. **Token audit** — R1 + scale coverage (spacing/motion/elevation/z/opacity/breakpoints).
4. **Theme audit** — used-MUI vs themed-MUI diff; scheme completeness.
5. **Component gap analysis** — framework component list vs kit+app canonicals;
   flag app-level canonicals not yet in the kit (Toast, DataState, StatusTag,
   PageBreadcrumb, Avatar, Charts).
6. **A11y audit** — R6 sweep + heuristics 1.3.1/1.4.1/2.1.1/2.4.x/2.5.8/4.1.2.
7. **IA audit** — nav tree vs NAVIGATION.md; Hick/Miller counts; wayfinding.
8. **UX audit** — Nielsen + laws scorecard with friction maps.
9. **Design-debt report** — accumulated violations by rule, with effort estimates.

---

## 6. Current known state (updated 2026-07-11 — keep fresh)

- Maturity **67/100 "Defined"**; compliance ≈ **72/100**.
- **Strong:** visual language, consistency enforcement via theme, focus-visible parity,
  dock contract, shells adoption (RailLayout 48 files), DataState 41 files.
- **Implemented this cycle:** scale tokens (`SPACING/BREAKPOINTS/Z_INDEX/OPACITY/
  MOTION/ELEVATION`); themed Checkbox/Radio/Switch/Slider/Progress/Skeleton/Badge;
  theme wired to spacing/breakpoints/zIndex tokens; **semantic scheme layer**
  (`SCHEMES` light/dark/highContrast + `createAormsTheme({ scheme })`, light default);
  theme transitions consume `MOTION` tokens (R7); **`StatusDot` promoted into the kit**
  (+ `STATUS_COLORS` canonical hues superseding `--cds-tag-*` for new code);
  **`DataState` + `ConfirmModal` promoted into the kit** (app files are compat
  re-exports; 40+ consumers inherit); app `StatusTag`/`StatusDot` now delegate to the
  kit; `TYPE_SCALE` token added and consumed by StudioAbstract micro-typography;
  kit versioned **0.1.0** with CHANGELOG + `sideEffects` field.
- **Open debt (ranked):** ① no tests/Storybook/visual-regression (kit has no test
  runner; adding one touches the root lockfile — do while tree is quiet); ② remaining
  app-level canonicals outside the package (Toast host ⟵ app-state entangled,
  Avatar ⟵ app resolveColor logic, Charts); ③ dark/high-contrast recipes are
  IMPLEMENTED (kit 0.2.0, `recipesFor`) but preview-grade — need visual sign-off +
  a scheme switcher UI (Settings); ④ no RTL/i18n; ⑤ no Figma library; ⑥ zero
  optimistic UI (Doherty); ⑦ visual QA of restyled controls on AUTHENTICATED
  screens (needs credentials/session — public `/design-system` verified rendering
  2026-07-11 via browser screenshot; /demo flow blocked by headless renderer hangs).
  *Resolved 2026-07-11:* governance (GOVERNANCE.md + CHANGELOG + semver 0.1.0);
  HCW-UI-KIT.md listing sync; `KnowledgeBankPortal` repaired (dock API, RailLayout,
  MUI-X v8 selection, StatusDot, duplicate-CTA removal) — tree fully green;
  **`PageBreadcrumb` promoted** (router-agnostic `linkComponent` injection — the
  react-router dep question is settled by injection, not a peer dep); last real-text
  inline `fontSize` cleared (RecoverWithBackupCode → theme body1).

---

## 7. Success criteria (definition of "mature")

Every UI built from HCW Kit · every visual property token-driven · every interaction on
HCW standards · WCAG 2.2 AA · docs ≡ implementation · MUI purely implementation ·
one canonical component per pattern · versioned, governed releases.
