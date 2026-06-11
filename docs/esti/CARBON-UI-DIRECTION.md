# ESTI Pure Carbon UI Policy

**Status:** Mandatory · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

The ESTI frontend uses only IBM Carbon Design System components, icons,
pictograms, charts, layout, typography, and design tokens. This is an
implementation constraint, not a visual suggestion.

## Required

- Build screens from `@carbon/react`, `@carbon/icons-react`,
  `@carbon/pictograms-react`, and `@carbon/charts-react`.
- Use Carbon `Grid` and `Column` with the 16/8/4-column 2x Grid.
- Use `Stack` for spacing and Carbon containers for grouping.
- Use `DataTable`, `Pagination`, search/filter controls, `Tabs`, `Modal`,
  `Tile`/`ClickableTile`, `Tag`, `ProgressBar`, `InlineNotification`, skeletons,
  and Carbon form controls for their intended semantics.
- Use semantic headings and paragraphs without decorative inline typography.
- Use only `--cds-*` tokens when a component API genuinely requires a colour.
- Validate keyboard access, focus order, accessible names, loading/error states,
  dark theme, and 320px/672px/1056px representative layouts.

## Prohibited

- Custom cards, status pills, progress bars, tabs, modals, tables, or buttons.
- Hard-coded hex/RGB colours, gradients, shadows, bespoke palettes, and custom
  keyframe animations.
- Decorative inline styles for font size, weight, colour, borders, or shadows.
- Custom CSS classes that implement a second visual system.
- Clickable non-interactive elements such as `Tile onClick`; use
  `ClickableTile` or Carbon buttons/links.
- User-configurable application theme colours. Firm branding applies to logos
  and generated documents, not the Carbon application chrome.

## Permitted CSS

`styles.scss` contains the Carbon import, full-viewport root fix, drawing-viewer
SVG sizing, and minimal colourless structural helpers that Carbon cannot
express. Any helper must affect only layout mechanics and must not define visual
identity. The exception must be documented beside the rule.

## Standard Patterns

- Page: `Grid` + `Column`, `Stack`, semantic `h1`, supporting paragraph, action.
- List: Carbon `DataTable` with toolbar search/filter and server pagination.
- Detail: Carbon tabs or structured grid; status represented by `Tag`.
- Dashboard: Carbon grid, tiles, charts, progress bars, and overflow menus.
- Empty/loading/error: shared Carbon skeleton, empty state, and notification.
- Destructive action: shared Carbon confirmation modal.
- Portal project selection: `ClickableTile`, never a click handler on `Tile`.

The implementation cleanup is tracked in [ROADMAP Phase 2](ROADMAP.md).
