# DESIGN TOKENS — ESTI AORMS

This document defines every token in use, mapping ESTI usage to Carbon's official token system, and documents the AORMS-specific alert/identity colour palette.

---

## Spacing Tokens

Carbon spacing tokens are declared as CSS custom properties in `styles.scss` on `:root`. All spacing in ESTI must use these tokens.

| Carbon Token | CSS Variable | Value | Sass value | Use in ESTI |
|---|---|---|---|---|
| `$spacing-01` | `var(--cds-spacing-01)` | 2px | `0.125rem` | Micro gaps, tag margins |
| `$spacing-02` | `var(--cds-spacing-02)` | 4px | `0.25rem` | Icon-to-text gap, tight Stack gap={2} |
| `$spacing-03` | `var(--cds-spacing-03)` | 8px | `0.5rem` | Stack gap={3}, small padding |
| `$spacing-04` | `var(--cds-spacing-04)` | 12px | `0.75rem` | Stack gap={4}, section padding |
| `$spacing-05` | `var(--cds-spacing-05)` | 16px | `1rem` | Stack gap={5}, page gutter, primary padding |
| `$spacing-06` | `var(--cds-spacing-06)` | 24px | `1.5rem` | Stack gap={6}, section separation |
| `$spacing-07` | `var(--cds-spacing-07)` | 32px | `2rem` | Stack gap={7}, zone separation |
| `$spacing-08` | `var(--cds-spacing-08)` | 40px | `2.5rem` | Large zone breaks |
| `$spacing-09` | `var(--cds-spacing-09)` | 48px | `3rem` | Header height, hero padding |
| `$spacing-10` | `var(--cds-spacing-10)` | 64px | `4rem` | Page-level vertical rhythm |

**In JSX, use `Stack gap={N}` where N is the token number.** Do not use `style={{ gap: "12px" }}` or numeric pixel values directly.

---

## Typography Tokens

Carbon v11 uses type styles via the `@carbon/react/scss/type` module. ESTI applies them in SCSS only.

| Carbon Type Style | Pixels | Weight | Use in ESTI |
|---|---|---|---|
| `label-01` | 12px | 400 | `.esti-label`, `.esti-label--secondary`, `.esti-label--helper` classes |
| `body-compact-01` | 14px | 400 | Default body text in tiles and tables |
| `body-01` | 14px | 400 | Paragraph text inside Carbon components |
| `body-compact-02` | 16px | 400 | Lead descriptions |
| `heading-compact-01` | 14px | 600 | Table headers, section labels |
| `heading-compact-02` | 16px | 600 | Tile headers, modal headings |
| `heading-03` | 20px | 400 | h3 elements |
| `heading-04` | 28px | 400 | h2 elements |
| `heading-05` | 32px | 400 | h1 page titles |
| `heading-06` | 42px | 300 | Hero numbers |
| `code-01` | 12px | 400 | Monospace labels (IBM Plex Mono) |
| `code-02` | 14px | 400 | Code snippets, ref numbers |

**Monospace numbers** (KPI values in dashboard, financial figures): use `fontFamily: "'IBM Plex Mono', monospace"` only as an inline style on `span`/`div` elements that are purely numeric display. Font size must still be on the Carbon scale (12, 14, 28px are used in Dashboard.tsx).

---

## Colour Tokens

### Carbon G100 Semantic Tokens (always use these for UI chrome)

| Token | CSS Variable | Use |
|---|---|---|
| Background | `var(--cds-background)` | Page background, sticky header fills |
| Background inverse | `var(--cds-background-inverse)` | Login mark, high-contrast elements |
| Layer 01 | `var(--cds-layer-01)` | Card/tile surface |
| Layer 02 | `var(--cds-layer-02)` | Elevated tile, table header |
| Border subtle | `var(--cds-border-subtle)` | All dividers, table borders, input borders |
| Border strong | `var(--cds-border-strong)` | Emphasis borders |
| Text primary | `var(--cds-text-primary)` | Main content text (#f4f4f4 in g100) |
| Text secondary | `var(--cds-text-secondary)` | Supporting text, descriptions |
| Text helper | `var(--cds-text-helper)` | Hint text, labels |
| Text disabled | `var(--cds-text-disabled)` | Inactive state text |
| Icon primary | `var(--cds-icon-primary)` | Default icon fill |
| Support error | `var(--cds-support-error)` | Error state borders and icons |
| Support warning | `var(--cds-support-warning)` | Warning state |
| Support success | `var(--cds-support-success)` | Success state |
| Support info | `var(--cds-support-info)` | Info state |
| Layer accent 01 | `var(--cds-layer-accent-01)` | Gantt track background |

### AORMS Alert Palette (Dashboard.tsx and CSS classes only)

These colours are outside the Carbon g100 system and are permitted ONLY for the operational alert/identity system in `Dashboard.tsx` and the corresponding CSS classes in `styles.scss`. They must not appear in any other route file.

| ESTI Name | Hex | CSS class prefix | Semantic meaning |
|---|---|---|---|
| `alert-stable` | `#42be65` | `.esti-telem-tile` state=stable | Practice operating normally |
| `alert-watch` | `#f1c21b` | `.esti-telem-tile` state=watch | Elevated — monitor |
| `alert-friction` | `#ff832b` | `.esti-telem-tile` state=friction | Degraded — act soon |
| `alert-critical` | `#fa4d56` | `.esti-telem-tile` state=critical | Critical — intervene now |
| `identity-client` | `#0f62fe` | `.esti-telem-tile CLIENT` border-top | CLIENT zone identity colour |
| `identity-finance` | `#6929c4` | `.esti-telem-tile FINANCE` border-top | FINANCE zone identity colour |
| `identity-project` | `#009d9a` | `.esti-telem-tile PROJECT` border-top | PROJECT zone identity colour |
| `identity-team` | `#1192e8` | `.esti-telem-tile TEAM` border-top | TEAM zone identity colour |
| `inactive` | `#6f6f6f` | `.esti-telem-tile` state=inactive | Module disabled / no signal |

---

## Border Tokens

| ESTI usage | Token or value | Rule |
|---|---|---|
| Table/tile dividers | `var(--cds-border-subtle)` | Always |
| Input borders | Applied by Carbon component | Do not override |
| Alert state border-top | Alert palette hex (Dashboard only) | 2px solid only |
| Drawing viewport border | `var(--cds-border-subtle)` | OK |
| Gantt chart borders | `var(--cds-border-subtle)` | OK |
| Card health indicator (dashboardUi.tsx `edge()`) | `var(--cds-support-error/warning/success)` | Left border only, 3px |

---

## Grid Tokens

| Token | CSS Variable | Value | Use |
|---|---|---|---|
| Grid margin | `var(--cds-grid-margin)` | 16px | Carbon 2x Grid default outer margin |

The dashboard uses `style={{ width: "80%", margin: "0 auto" }}` as its outer container — this is a documented design exception for the command center layout, not a pattern to copy elsewhere. All other screens use Carbon `Grid` within the `Content` shell which handles margins automatically.
