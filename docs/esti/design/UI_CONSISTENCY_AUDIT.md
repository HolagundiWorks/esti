# UI CONSISTENCY AUDIT — ESTI AORMS

All violations found in the current codebase audit (June 2026). Violations are ordered by priority.

P0 = Non-Carbon component in production
P1 = Wrong spacing/typography token (raw px/rem where Carbon token exists)
P2 = Hardcoded colour that should be --cds-*
P3 = Minor structural drift

---

## Violation Table

| File | Line approx | Violation type | Current value | Required value | Priority |
|---|---|---|---|---|---|
| Company.tsx | ~482 | P0 non-Carbon component | StructuredListWrapper, StructuredListBody, StructuredListRow | Table size=sm | P0 |
| Dashboard.tsx | ~813 | P1 raw div grid | style={{ display: grid, gridTemplateColumns: 1fr 1fr, gap: 1px }} | Grid condensed + Column | P1 |
| Dashboard.tsx | ~863 | P1 raw div grid | same pattern for financial overview | Grid condensed + Column | P1 |
| Dashboard.tsx | ~943 | P1 raw div grid | same pattern for attendance | Grid condensed + Column | P1 |
| Dashboard.tsx | ~476 | P1 inline fontSize | style={{ fontSize: 12, color: ... }} | .esti-label class | P1 |
| Dashboard.tsx | ~764 | P1 inline fontSize | style={{ fontFamily: ..., fontSize: 28 }} numeric KPIs | Carbon heading token | P1 |
| Dashboard.tsx | ~748 | P1 inline fontSize | style={{ color: ..., fontSize: 13 }} | .esti-label--secondary | P1 |
| Dashboard.tsx | ~1064 | P1 inline fontSize | style={{ fontFamily: ..., fontSize: 12 }} | .esti-label or code style | P1 |
| Dashboard.tsx | ~1067 | P1 inline fontSize | style={{ flex: 1, fontSize: 14 }} | No inline fontSize | P1 |
| Dashboard.tsx | ~1068 | P1 inline fontSize | style={{ fontFamily: ..., fontSize: 11 }} | .esti-label (12px min) | P1 |
| FeeProposals.tsx | ~192 | P1 flex div gap 12 | style={{ display: flex, gap: 12 }} | Stack orientation=horizontal gap={4} | P1 |
| Letters.tsx | ~215 | P1 flex div gap 12 | style={{ display: flex, gap: 12 }} | Stack orientation=horizontal gap={4} | P1 |
| KnowledgeBank.tsx | ~53 | P1 flex div gap 12 | style={{ display: flex, gap: 12, flexWrap: wrap }} | Stack orientation=horizontal gap={4} | P1 |
| KnowledgeBank.tsx | ~161 | P1 inline height calc | style={{ height: calc(100vh - 280px), minHeight: 500 }} | .esti-chart-lg structural class | P1 |
| Team.tsx | ~78 | P1 custom div toolbar | div className=esti-team-bar | Stack orientation=horizontal gap={4} | P1 |
| Reconcile.tsx | ~131 | P1 inline maxWidth TextInput | style={{ maxWidth: 280 }} | Column sizing | P1 |
| Reconcile.tsx | ~155-167 | P1 inline maxWidth TextInput | style={{ maxWidth: 220 }} x3 | Column sizing | P1 |
| Settings.tsx | ~91-164 | P1 inline maxWidth Tile | style={{ maxWidth: 520 }} x4 | Column lg={8} wrapper | P1 |
| Performance.tsx | ~281 | P1 inline maxWidth Tile | style={{ maxWidth: 640 }} | Column lg={8} wrapper | P1 |
| Company.tsx | ~216 | P1 inline maxWidth Tile | style={{ maxWidth: 760 }} | Column lg={10} or lg={12} | P1 |
| Company.tsx | ~238 | P1 inline height img | style={{ height: 48 }} | structural helper class | P1 |
| ProjectDetail.tsx | ~172-180 | P1 inline sticky header | position sticky + zIndex 100 + paddingBottom + background inline | CSS class in styles.scss | P1 |
| ProjectDetail.tsx | ~184-190 | P1 inline flex | style={{ display: flex, alignItems: center, gap: 6 }} | Stack orientation=horizontal gap={2} | P1 |
| ProjectDetail.tsx | ~209 | P1 inline marginTop | style={{ marginTop: 8 }} | Stack gap={3} | P1 |
| styles.scss | ~200 | P1 non-scale gap | .esti-login-brand { gap: 0.6rem } | var(--cds-spacing-03) 8px | P1 |
| styles.scss | ~462 | P1 custom font-size | .esti-qi-chart-label { font-size: 0.75rem } | @include type.type-style(label-01) | P1 |
| styles.scss | ~202 | P2 border-radius in login mark | .esti-login-mark { border-radius: 4px } | No border-radius per Rule 2 | P2 |
| Dashboard.tsx | ~377 | P2 hardcoded colour | color: #161616 on MacroHdr status badge | var(--cds-background) | P2 |
| Dashboard.tsx | ~1042 | P1 inline border | style={{ borderLeft: 1px solid var(--cds-border-subtle), borderTop: ... }} | CSS class | P1 |
| Dashboard.tsx | ~1045 | P1 inline padding | style={{ borderBottom: ..., borderRight: ..., padding: ... }} | CSS class | P1 |
| Company.tsx | ~482 | P0 StructuredList | StructuredListWrapper not part of @carbon/react v11 standard | Table size=sm | P0 |

---

## Acceptable Patterns (Not Violations)

The following inline styles are acceptable because they use CSS tokens correctly:

- style={{ padding: 0 }} on TabPanel in Dashboard — suppresses Carbon default padding for flush layout
- style={{ color: var(--cds-text-secondary) }} — correct token usage
- style={{ borderTop: 1px solid var(--cds-border-subtle) }} — correct token usage
- style={{ display: none }} on hidden file input — functional requirement
- style={{ var(--cds-spacing-*) }} — correct approach for one-off structural needs
- ZCOLOR hex values in Dashboard.tsx — documented AORMS exception palette
- TILE_COLOR hex values in Dashboard.tsx — documented AORMS exception palette
- resolveColor() output in Team.tsx staff portrait tiles — documented staff colour convention
