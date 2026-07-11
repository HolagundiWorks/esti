# Compliance audit — 2026-07-11

**Question:** is the application actually using HCW Kit? **Method:** rule-by-rule
detection sweeps (recipes in the KB §2) over `frontend/src`; quantified, `file:line`
evidence. **Estimated compliance: ~72/100 at audit time — several gaps closed the
same day (noted inline).**

| Check | Evidence | Verdict |
| --- | --- | --- |
| Token compliance — hex | 32 hits, ~26 sanctioned (canvas/SVG data-viz, brand); 2 real targets (PlanReader, ZonalCompliance) | ◐ registered |
| Token compliance — inline fontSize | 55 hits → icons/mock ruled sanctioned; real-text drift fixed (TYPE_SCALE) | ✓ closed |
| Token compliance — legacy `--cds-*` | 56 usages; frozen-but-sanctioned for existing sites; forbidden in new code | ✓ policy set |
| Component compliance — status | filled chips eliminated (console 12×, KBP 3×, comms tabs); StatusDot canonical | ✓ closed |
| Component compliance — duplicates | TagChip forks removed except `Clients.tsx` (parallel-WIP, registered) | ◐ registered |
| Layout compliance | shells everywhere: RailLayout 48 · MarketingShell 15 · AuthRail 12 · PortalShell 9 · ExternalPortal 5; 6 sanctioned raw-rail files | ✓ strong |
| Interaction compliance | useScreenActions 26+ screens; `[]`-while-dialog honoured; KBP brought to contract | ✓ strong |
| Accessibility compliance | 18 issue classes fixed across 24 files (see UX-audit artifact); dialog-name long tail remains | ◐ registered |
| Custom styling (`styled()`) | 12 files, mostly HiddenFileInput (sanctioned structural pattern) | ✓ acceptable |

**Open items feed the [Design Debt Register](DESIGN-DEBT-REGISTER.md).** Re-run
quarterly or after any large feature wave.
