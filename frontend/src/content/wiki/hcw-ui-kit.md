---
title: HCW-UI design system
slug: hcw-ui-kit
excerpt: Human Centric Works UI Kit (@hcw/ui-kit) — three material layers, Rail · Stage · Dock spatial model, and Urbanist + Radiant Orange tokens.
order: 1
section: Overview
domain: hcw-ui
updated: 2026-07-10
---

**HCW-UI** (*Human Centric Works UI Kit*, package `@hcw/ui-kit`) is the single design system behind every AORMS surface — workspace app, client and consultant portals, licensing console, marketing pages, and the live specimen at [/design-system](/design-system).

## Thesis — depth encodes importance

Three material languages stack by visual depth. Pick a layer by **role**, not taste:

| Layer | Language | Used for |
| --- | --- | --- |
| **1 — Flat** | Hyperminimalist | Data at rest — tables, text, headings, surfaces |
| **2 — Soft** | Neumorphic | Objects you work within — dialogs, panels, widgets, recessed inputs |
| **3 — Glass** | Glassmorphism | Live layer — hover, CTAs, ActionDock, priority alerts |

**Radiant Orange** (`#FF4F18`) is the single accent. Filled buttons carry white text; links use slate, never the accent fill.

**Shape:** surfaces are square (`RADIUS: 0`). Generic `MuiButton` uses `BUTTON_RADIUS` (4px). The **ActionDock** tray and its buttons use **`DOCK_PILL_RADIUS`** — a full capsule pill (`ACTION_DOCK_TRAY` + `actionDockButtonSx`).

## Spatial model — Rail · Stage · Taskbar · ActionDock

| Zone | Role |
| --- | --- |
| **Rail** (20%, fixed) | Navigation, filters, screen context — glass on marketing; glass dash rail in the app |
| **Stage** (scrolls) | Primary work surface |
| **Taskbar footer** | Calculator · launcher cluster · tray (clock, alerts, ID, sign out) |
| **ActionDock** (floating, bottom-centre) | Context-aware screen actions via `useScreenActions` — left destroy · centre create · right commit |

Login and auth forms sit in the **rail**, not on the stage.

## Key primitives

- `<MuiRoot>` — themed app shell
- `<Surface layer="flat|soft|glass|clearGlass|headingGlass">` — layer recipes
- `<GlassRail>` — marketing / auth rail
- `useScreenActions` — publish CTAs to the global ActionDock
- `HealthGlassOrb` — office health signal on glass chrome

Tokens live in `packages/hcw-ui-kit/src/tokens.ts`. The frontend theme shim re-exports the kit — do not add raw hex in product screens.

## Where to go next

- **Live specimen:** [Design system](/design-system) on the public site
- **Engineering docs:** `docs/esti/HCW-UI-KIT.md` and `docs/esti/HCW-UI-UX-PRINCIPLES.md` in the monorepo
- **Brand heritage:** `docs/esti/AORMS-BRANDING-KIT.md`

## Frequently asked questions

### Is Carbon still used?

No. `@carbon/react` was removed (2026-07). Legacy `--cds-*` CSS variables in `styles.scss` are a static compatibility layer only.

### Where do marketing pages get their layout?

`MarketingShell` — glass rail (open or collapsed icon strip) + scrolling stage + SectionDock for in-page sections. Flat marketing content uses the `lp2-ds` class family.

### How do I add a screen action?

Call `useScreenActions` from `@hcw/ui-kit` with `{ id, zone, label, onClick, tone?, icon? }`. Clear the array when a dialog is open so the dock does not compete with modal CTAs.
