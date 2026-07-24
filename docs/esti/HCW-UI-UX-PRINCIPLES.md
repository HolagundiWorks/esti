# HCW-UI-UX — UX principles

**Human Centric Works** (*HCW*) is the product UX philosophy behind **HCW-UI-Kit**
(`@hcw/ui-kit`). This document is the **canonical UX authority** — *why* we build
interfaces the way we do. For *how* (tokens, layers, components, SCSS), see
**[HCW-UI-KIT.md](HCW-UI-KIT.md)**. For *where* modules live, see
**[NAVIGATION.md](NAVIGATION.md)**. For brand heritage, see
**[AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md)**.

**Adopted:** 2026-07-10 · **Applies to:** workspace app, portals, licensing
console, marketing site, and every future `@hcw/ui-kit` consumer.

---

## 1. North star

> **Depth encodes importance. Chrome serves the task. One spatial model everywhere.**

**Live reference:** [`/design-system`](https://aorms.in/design-system) on the public site —
interactive layer demos, spatial diagram, token palette, and component gallery.

Users are architecture principals and studio staff under time pressure — not
power users exploring a new tool every week. The interface must:

1. **Stay calm at rest** — most pixels are flat information (tables, text, labels).
2. **Lift only what acts** — glass and accent orange mean “do something now”.
3. **Reuse one geography** — rail · stage · footer · dock; muscle memory beats novelty.
4. **Disclose progressively** — show the next step, not every branch at once.
5. **Work without a mouse** — keyboard, focus, landmarks, and target size are not optional polish.

When visual taste and UX law conflict, **UX law wins** unless there is an explicit,
documented product exception (marketing atmosphere in `landing.scss` is one).

---

## 2. Document map

| Question | Read |
|----------|------|
| What is **HCW UX** (framework + process)? | [HCW-UX.md](../HCW-UX.md) |
| What is the **UX framework** (purpose · KPIs · diagram)? | [HCW-UX-FRAMEWORK.md](../HCW-UX-FRAMEWORK.md) |
| How do we **run** UX work (Plan → Improve)? | [HCW-UX-PROCESS.md](../HCW-UX-PROCESS.md) |
| What colour / layer / component? | [HCW-UI-KIT.md](HCW-UI-KIT.md) |
| What heuristic or law applies? | **This document** |
| How should an AI surface report, ask, and defer? | [HCW-AI-ORCHESTRATION-UX.md](HCW-AI-ORCHESTRATION-UX.md) |
| Construction stakeholders / lifecycle / field? | [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) |
| How do we measure UX? | [HCW-UX-KPI-INSTRUMENT.md](HCW-UX-KPI-INSTRUMENT.md) |
| Where does this module live in nav? | [NAVIGATION.md](NAVIGATION.md) |
| Why Radiant Orange / Urbanist? | [AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md) |
| Shell rollout status | [ROADMAP.md](ROADMAP.md) |

---

## 3. Laws → HCW decisions

Each row ties an established UX principle to a **shipped or required** pattern.

| Law / heuristic | Principle | HCW / AORMS application |
|-----------------|-----------|-------------------------|
| **Jakob's Law** | Users expect your product to work like others they know | Ribbon + sidebar IA; footer taskbar metaphor; dock zones (destroy left · create centre · commit right) |
| **Hick's Law** | More choices → slower decisions | Rail holds nav/filters only; **one** ActionDock for page CTAs; marketing rail expanded by default; admin in hamburger not footer |
| **Fitts's Law** | Bigger / nearer targets are faster to hit | **≥44px** chrome targets (footer, ribbon, dock); dock bottom-centre; primary CTAs in dock not scattered |
| **Miller's Law** | ~7±2 chunks in working memory | Historical reference; **Cowan (~4±1) is the kit cap** — see CAPACITY |
| **Cowan working memory** | ~4±1 chunks under load | `CAPACITY.*` hard caps (KPI ≤4, dock ≤5, toasts ≤2, open loops ≤3); audits reject unbounded strips |
| **Endsley SA** | Perception → comprehension → projection | `AwarenessStrip`: state · meaning · next (+ judgment flag) |
| **Bailey / Iqbal interruption cost** | Unwanted alerts tax performance | `INTERRUPTION` budget; `ToastHost` trims stack; errors assert, ambient scarce |
| **Reason error taxonomy** | Slips ≠ mistakes | `ConfirmModal` `kind="slip"|"mistake"` + `reason` band; toast `onUndo` for slips |
| **Norman gulf of evaluation** | Did my action work? | `publishOutcome` / `ActionOutcomeBanner` after dock commits |
| **Treisman / Ware preattentive** | Colour alone is weak | `StatusDot` `shape` + `STATUS_SHAPE`; HealthGlassOrb shape-encodes severity |
| **Zeigarnik / goal-gradient** | Incomplete work sticks / progress motivates | `AwarenessStrip` `loops` ≤ `CAPACITY.openLoops`; empty when none |
| **Mayer contiguity** | Related info must be near | `layoutSx.formField`; `DataState` empty action beside the void |
| **Lee & See trust calibration** | Trust must match reliability | `TRUST` copy tokens; judgment-only interrupt cue; no success theatre |
| **W3C COGA** | Cognitive a11y beyond AA | `COGA` target floors + calm-mode type/target steps |
| **Tesler's Law** | Some complexity is irreducible | Project delivery complexity lives in **stage** tables/editors — not hidden, but **chunked** by rail tabs + breadcrumbs |
| **Doherty threshold** | Responsiveness &lt; ~400ms feels instant | Skeletons on heavy screens; optimistic UI where safe; avoid blocking whole stage for rail telemetry |
| **Aesthetic-usability** | Pleasing UI feels more usable | Layered materials + calm canvas — but **never** glass on every tile (kills clarity) |
| **Peak–end rule** | Peaks and endings dominate memory | ActionDock commit (RIGHT) for save/send; clear success toasts; portal sign-out always reachable in rail/dock |
| **Serial position** | First and last items remembered | Ribbon: Projects · Clients first; dock: Create centre · Save right; hero brand first |
| **Von Restorff** | Distinct items stand out | **One** accent (Radiant Orange); glass scarce; error/warning alerts tinted glass |
| **Parkinson's Law** | Work expands to fill time | Progressive disclosure: FAQ `<details>`, collapsed project IA, dialogs for create — not always-visible forms |
| **Goal-gradient** | Progress motivates completion | Breadcrumbs + dock commit; onboarding value-prop in marketing rail; empty states with one next action |
| **Progressive disclosure** | Reveal detail on demand | FAQ accordion; nested project tabs grouped; `Dialog` for create; rail collapse optional |
| **Nielsen #1 Visibility** | Show status clearly | `StatusDot` / `HealthGlassOrb`; office health in rail; zone row in stage head |
| **Nielsen #2 Real world** | Match user language | Indian practice terms (GST, COA, MoM, paise); `formatINR` everywhere |
| **Nielsen #3 User control** | Undo / escape | Dock LEFT = destroy; dialog Cancel; Escape closes menus; skip link to `#esti-main` / `#lp2-main` |
| **Nielsen #4 Consistency** | Same patterns everywhere | `RailLayout` / `GlassRail`; `useScreenActions`; [NAVIGATION.md](NAVIGATION.md) = chrome SoT |
| **Nielsen #5 Error prevention** | Prevent mistakes | Confirm on destroy (dock LEFT); required fields + `helperText`; disable dock when stale |
| **Nielsen #6 Recognition** | Show options, don't recall | Search in footer + Ctrl/Cmd+K; ribbon menus; breadcrumbs — not URL memory |
| **Nielsen #7 Flexibility** | Shortcuts for experts | Keyboard ribbon menus; Alt+C calculator; dock keyboard focus; power users use search |
| **Nielsen #8 Minimalist** | Every extra unit competes | No inline page CTAs once dock adopted; no duplicate Create in marketing rail + dock |
| **Nielsen #9 Error recovery** | Clear error messages | `Alert` + field `error`/`helperText`; tRPC errors surfaced in dialog or toast |
| **Nielsen #10 Help** | Contextual help | `helperText`; ESTI / Ask ESTI; wiki links on marketing; empty-state copy |

---

## 4. Spatial model — UX roles

The shell is not decoration. Each region has a **cognitive job**:

```
┌─ RAIL ─────────────┐  ┌─ STAGE ─────────────────────────────┐
│  Where am I?        │  │  What am I working on?             │
│  What's the status? │  │  Tables · editors · primary content  │
│  Filters · tabs     │  │                                    │
│  Auth forms (login) │  │         ╭── ActionDock ──╮         │
└────────────────────┘  │         │ destroy│create│commit │   │
                        └─────────┴──────────────────────────┘
├─ TASKBAR FOOTER ─ search · launchers · tray ─────────────────┤
```

| Region | User question it answers | Must NOT contain |
|--------|--------------------------|------------------|
| **Ribbon** | Which major area of the practice? | Page-level Create/Save (→ dock) |
| **Rail** | What slice / filter / identity applies? | DataGrids; primary tables; centred login card |
| **Stage** | What is the work artifact? | Duplicate CTAs; global nav |
| **ActionDock** | What can I do to this screen? | Modal-only actions while dialog open (`[]`) |
| **Taskbar footer** | What tool do I need without leaving context? | Admin module tree (→ ribbon hamburger) |

**Marketing** uses the same model **without** taskbar footer: rail (nav) · stage (story) ·
dock (Create / Sign in only). See [HCW-UI-KIT.md § Marketing shell](HCW-UI-KIT.md#marketing-shell--public-site-marketingshell).

---

## 5. Layer philosophy — UX not decoration

Pick a material layer by **role**, never by mood.

| Layer | UX job | User feels |
|-------|--------|------------|
| **Flat** | Information at rest | “I’m reading / comparing data.” |
| **Soft** | Object I work inside | “I’m in a form, dialog, or card.” |
| **Glass** | Live / actionable | “This wants my attention or click.” |
| **Clear glass** (marketing) | Chrome over atmosphere | “I see the story through the shell.” |
| **Heading glass** (marketing) | Section boundary | “A new chapter starts here.” |

**Anti-pattern:** glass on every marketing tile — users cannot see the contour story,
and nothing stands out (violates Von Restorff + depth thesis).

**Decision tree:** [HCW-UI-KIT.md § Layer decision tree](HCW-UI-KIT.md#layer-decision-tree).

---

## 6. ActionDock — UX contract

The dock is the **single locus of page-level intent**. Users build muscle memory:

| Zone | Intent | Tone | Examples |
|------|--------|------|----------|
| **LEFT** | Reversible / destructive | `danger` | Delete · Discard · Cancel flow |
| **CENTER** | Create / generate | `primary` | New · Add · Create account |
| **RIGHT** | Commit / persist | `primary` | Save · Update · Send |

**Rules**

1. Publish via `useScreenActions([...], deps)` — clear on unmount.
2. While a create/edit **Dialog** is open, publish **`[]`** so dock does not fight `DialogActions`.
3. Do not duplicate the same action inline on the page **and** in the dock.
4. Non-create utilities (Export, Resync) → **RIGHT**, not CENTER.
5. Minimum touch target: theme + dock styles target **≥44px** effective area.

---

## 7. Cognitive load checklist

Apply on every new screen or marketing section.

| Check | Guideline |
|-------|-----------|
| **Chunking** | One primary task per stage view; use tabs in rail for secondary slices |
| **7±2** | ≤4 KPIs visible without scroll; ≤4 trust/keyword chips; FAQ disclosed not dumped |
| **Hero budget** | Brand + headline + one supporting line — no CTA wall in hero |
| **Wayfinding** | `PageBreadcrumb` on workspace screens; marketing hash links in rail |
| **Progressive disclosure** | `<details>` for FAQ; dialogs for create; optional rail collapse |
| **Consistent verbs** | Create / Save / Delete — not “Submit”, “OK”, “Apply” mixed on same surface |
| **Loading** | Skeleton or labelled spinner — never blank stage |
| **Empty state** | One sentence + one primary action (dock or inline link) |

---

## 8. Accessibility (WCAG 2.2 alignment)

Target: **AA** for workspace and marketing. AAA where cheap (contrast on helper text).

| Requirement | HCW implementation |
|-------------|-------------------|
| **1.3.1 Info & relationships** | One `<main>` per shell (`#esti-main` / `#lp2-main`); headings in order; shape + label on health orbs |
| **1.4.3 Contrast** | `textHelper` `#667085` on Fog Gray / white; links slate not orange |
| **2.1.1 Keyboard** | Ribbon menus: click/Enter + arrows; dock focusable; skip link visible on focus |
| **2.4.1 Bypass blocks** | `.esti-skip-link` / `.lp2-skip` → main landmark |
| **2.4.7 Focus visible** | `FOCUS_RING` token; `:focus-visible` on rail links and dock |
| **2.5.8 Target size** | **44×44px** minimum for persistent chrome (footer, ribbon admin, dock) |
| **2.3.3 Animation** | `prefers-reduced-motion`: contour depth static; reveal classes applied; no decorative pulse required |

**Health orbs:** shape encodes severity (circle / triangle / square) — colour is secondary.
See `HealthGlassOrb` / `OfficeHealthGlyph`.

---

## 9. Marketing — UX rules

| Rule | Rationale |
|------|-----------|
| **Brand test** | Logo first, not text “AORMS” | Recognition, brand equity |
| **Dock-only CTAs** | Create + Sign in not duplicated in rail | Hick · single locus |
| **Clear glass rail** | Atmosphere visible | Aesthetic-usability without milking stage |
| **Heading glass only** | Full-width section heads | Hierarchy; sub-cards stay flat |
| **FAQ 3-up grid** | `<details>` per card | Progressive disclosure; scannable grid |
| **Contour scroll** | Depth 0→1 over **full page** | Goal-gradient through long story |
| **No nested `<main>`** | Blog/SEO inside `MarketingShell` | Landmark clarity |

Editorial CSS lives in `landing.scss` — not in `@hcw/ui-kit` tokens.

---

## 10. Workspace — UX rules

| Rule | Rationale |
|------|-----------|
| **Login in rail** | Form never centred on stage | Consistent spatial model; Jakob |
| **Breadcrumbs** | `PageBreadcrumb` on adopted screens | Recognition; orientation |
| **Search discoverable** | Footer + Ctrl/Cmd+K | Nielsen #6 |
| **Studio Intelligence reference** | `/` proves rail + stage + health | Canonical pattern — clone, don’t invent |
| **Parallel WIP** | Avoid `Projects.tsx` / `Clients.tsx` unless asked | Stability |

---

## 11. Content & microcopy

| Pattern | Rule |
|---------|------|
| **Buttons** | Verb-first: “Create project”, “Save changes”, not “OK” |
| **Errors** | What failed + what to do next |
| **Helper text** | `esti-label--helper` / MUI `helperText` — not `fontSize: 0.75rem` ad hoc |
| **Money** | Integer paise; `formatINR` / `formatINRShort` — never float rupees in UI |
| **Dates** | India locale (`en-IN`) in footer clock and filing screens |

---

## 12. New screen review (agent / PR checklist)

Before shipping UI:

- [ ] Uses `RailLayout` or `GlassRail` — no bespoke rail geometry
- [ ] Rail: identity / tabs / filters only — **no** DataGrid in rail
- [ ] Stage: primary work content; scrolls independently (desktop)
- [ ] Page CTAs via `useScreenActions`; dock cleared while dialog open
- [ ] Breadcrumb if screen is deeper than top-level module
- [ ] Layer chosen by role ([decision tree](HCW-UI-KIT.md#layer-decision-tree))
- [ ] No new raw hex — `@hcw/ui-kit` tokens only (marketing: `landing.scss` exceptions documented)
- [ ] Keyboard path verified for primary action
- [ ] `[NAVIGATION.md](NAVIGATION.md)` updated if chrome or IA changed
- [ ] Helper text meets contrast; destroy actions in dock LEFT

---

## 13. Anti-patterns (do not ship)

| Anti-pattern | Why |
|--------------|-----|
| Centred login card on stage | Breaks rail-first model; duplicates auth spatial grammar |
| Inline Save + dock Save | Duplicate affordance; Fitts waste |
| Rounded corners on panels/cards/chips | Surfaces are square (`RADIUS: 0`); `MuiButton` uses `BUTTON_RADIUS` (4px); **ActionDock** tray + buttons use `DOCK_PILL_RADIUS` (capsule) |
| Glass on every card | Flattens hierarchy; hides marketing atmosphere |
| Hover-only ribbon nav | Blocks keyboard users |
| `primaryTypographyProps` on MUI v6+ | Use `slotProps` — typing and a11y consistency |
| Nested `<main>` landmarks | Screen reader confusion |
| Top-level Estimation nav | Redirects to projects — [NAVIGATION.md](NAVIGATION.md) |
| Accent orange for body links | Orange = fill/CTA only — [AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md) |
| More than one primary CTA above the fold (marketing) | Splits attention; use dock |

---

## 14. Measurement & audits

UX quality is reviewed against this document and:

- Code + [NAVIGATION.md](NAVIGATION.md) vs shipped chrome
- [07-UX-REVIEW-CHECKLISTS.md](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md) (measurable pass/fail)
- [11-audits/README.md](../hcw-kit/11-audits/README.md) — surface audit index
- Token contrast in `src/tokens.ts`
- Manual keyboard pass on new chrome

When audit findings and code diverge, **code + this doc + the debt register** win.

---

## 15. Related implementation files

| Area | Path |
|------|------|
| Kit package | this repo — kit at root (`src/`) |
| Workspace shell | `frontend/src/App.tsx`, `AppRibbon.tsx`, `AppFooterBar.tsx` |
| Rail layout | `frontend/src/components/RailLayout.tsx` |
| Marketing shell | `frontend/src/components/landing/MarketingShell.tsx` |
| Contours | `frontend/src/components/landing/LandingContours.tsx` |
| Glass SCSS (workspace) | `frontend/src/glass.scss` |
| Marketing SCSS | `frontend/src/landing.scss` |
| Breadcrumbs | `frontend/src/components/PageBreadcrumb.tsx` |

---

*HCW-UI-UX Principles · Holagundi Consulting Works · AORMS / ESTI*
