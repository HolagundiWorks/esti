# HCW Kit & AORMS — audit index

**Updated:** 2026-07-11 · **Living queue:** [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md)

All audits are repo-resident markdown — no external canvas URLs. Re-run surface
audits after major feature waves; update the debt register in the same PR as fixes.

---

## Surface audits (tracked issues)

| Audit | Scope | Path |
| --- | --- | --- |
| **AORMS-Studio interface** | Authenticated workspace (`studio.aorms.in`) — shell, nav, dock, a11y, loading | [AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md](../../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md) |
| **Public pages & URLs** | Marketing, wiki, blog, auth, SEO landings | [PUBLIC-PAGES-AUDIT-2026-07-11.md](../../marketing/PUBLIC-PAGES-AUDIT-2026-07-11.md) |
| **Security** | API, tRPC, storage, CSP, sessions, deploy | [SECURITY-AUDIT-2026-07-11.md](../../esti/SECURITY-AUDIT-2026-07-11.md) |

**Checklists:** [07-UX-REVIEW-CHECKLISTS.md](../07-UX-REVIEW-CHECKLISTS.md) ·
[HCW-UI-UX-PRINCIPLES.md](../../esti/HCW-UI-UX-PRINCIPLES.md)

---

## Kit maturity snapshot — 2026-07-11

**Method:** 16-section framework, evidence-based static analysis (`file:line`).
**Overall: 67/100 — "Defined"** *(0.1.0–0.3.0 cycle closed several gaps — re-score
after visual sign-off).*

| Area | Score /10 | One-line basis |
| --- | --- | --- |
| Foundations (tokens) | 6.5 → improving | strong colour/recipe layer; scale ladders added |
| Visual language | 8.5 | coherent thesis, enforced centrally by theme |
| Components | 6.0 → improving | thin primitive set; canonicals promoted this cycle |
| Interaction patterns | 8.0 | dock contract + shells widely adopted |
| Accessibility | 7.0 | focus parity + gates strong; dialog names mostly fixed |
| Responsive | 6.5 | rail stack works; no formal breakpoint audit |
| UX heuristics | 7.5 | principles doc maps Nielsen×10 to shipped patterns |
| UX laws | 8.0 | laws are design inputs, documented per pattern |
| Documentation | 7.0 → improving | strong specs; hierarchy + governance added |
| Developer experience | 5.0 → improving | vitest suite added (0.3.0); gallery partial |
| Designer experience | 3.0 | no Figma library/variables |
| Governance | 4.0 → improving | semver + CHANGELOG + GOVERNANCE added |
| Performance | 6.0 | sideEffects added; no bundle budget |
| Content design | 7.5 | verb/error/money/locale rules enforced |
| Scalability | 6.5 | scheme layer + injection; RTL/i18n absent |

**Level:** Defined (documented + enforced; not yet Managed — regression harnesses
incomplete). **Studio interface detail:** see
[AORMS-STUDIO-INTERFACE-AUDIT](../../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md).

---

## Kit compliance snapshot — 2026-07-11

**Question:** is the application using HCW Kit? **Method:** R1–R9 detection sweeps
(recipes in [HCW-KIT-AI-KNOWLEDGE-BASE.md](../../esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) §2).
**Estimated compliance: ~72/100 at audit time** — several gaps closed same day.

| Check | Evidence | Verdict |
| --- | --- | --- |
| Token compliance — hex | 32 hits, ~26 sanctioned (canvas/SVG, brand); 2 targets (PlanReader, ZonalCompliance) | ◐ D4 |
| Token compliance — inline fontSize | real-text drift fixed (TYPE_SCALE) | ✓ closed |
| Token compliance — legacy `--cds-*` | 56 usages; frozen compat; forbidden in new code | ✓ policy |
| Component compliance — status | filled chips eliminated; StatusDot canonical | ✓ closed |
| Component compliance — duplicates | TagChip fork remains in `Clients.tsx` (parallel-WIP) | ◐ D11 |
| Layout compliance | RailLayout 48 · MarketingShell 15 · AuthRail 12 · PortalShell 9 · ExternalPortal 5 | ✓ strong |
| Interaction compliance | useScreenActions 26+ screens; `[]`-while-dialog honoured | ✓ strong |
| Accessibility compliance | 18 issue classes fixed; 3 WIP dialogs remain — [Studio audit I1–I2](../../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md) | ◐ registered |
| Custom styling (`styled()`) | 12 files, mostly HiddenFileInput (sanctioned) | ✓ acceptable |

Open items → [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md).

---

## Agent workflow

1. Read [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md) before UI changes.
2. Run checklist sweeps from [07-UX-REVIEW-CHECKLISTS.md](../07-UX-REVIEW-CHECKLISTS.md).
3. Deposit new findings in the relevant surface audit **or** the debt register.
4. Skill entry point: `.claude/skills/hcw-design-audit/SKILL.md`.
