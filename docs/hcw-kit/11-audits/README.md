# HCW Kit & AORMS — audit index

**Updated:** 2026-07-12 · **Living queue:** [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md) — **1 low item (D18)** after an evidence-based audit run · Maturity **83/100** · Compliance **90/100** · Canonical kit repo: **github.com/HolagundiWorks/hcwux**

All audits are repo-resident markdown — no external canvas URLs. Re-run surface
audits after major feature waves; update the debt register in the same PR as fixes.

---

## Surface audits (tracked issues)

| Audit | Scope | Path |
| --- | --- | --- |
| **AORMS-Studio interface** | Authenticated workspace (`studio.aorms.in`) — shell, nav, dock, a11y, loading | [AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md](../../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md) |
| **Public pages & URLs** | Marketing, wiki, blog, auth, SEO landings | [PUBLIC-PAGES-AUDIT-2026-07-11.md](../../marketing/PUBLIC-PAGES-AUDIT-2026-07-11.md) |
| **Public pages UI/UX** | Same scope — checklist + T7 layer compliance | [PUBLIC-PAGES-UX-AUDIT-2026-07-11.md](../../marketing/PUBLIC-PAGES-UX-AUDIT-2026-07-11.md) |
| **Security** | API, tRPC, storage, CSP, sessions, deploy | [SECURITY-AUDIT-2026-07-11.md](../../esti/SECURITY-AUDIT-2026-07-11.md) |

**Checklists:** [07-UX-REVIEW-CHECKLISTS.md](../07-UX-REVIEW-CHECKLISTS.md) ·
[HCW-UI-UX-PRINCIPLES.md](../../esti/HCW-UI-UX-PRINCIPLES.md)

---

## Kit maturity snapshot — 2026-07-12 (evidence-based re-score)

**Method:** 16-section weighted rubric; each dimension anchored to a **measured count**
(reproducible `rg` / test-runner evidence), not an estimate.
**Overall: 83/100 — "Managed"** (weighted Σ wt×score). Hard evidence: 10/10 token
families in `tokens.ts` · **40 MUI components themed** in `theme.ts` · 15 primitives
exported/typed · **51 unit tests** (verified runner) + Playwright VR in CI · 10
governance docs (00–13) · 276 error-titled mutations · 37 dock screens.

| Area | Wt | Score | Measured evidence |
| --- | --- | --- | --- |
| Components | 20% | 7.5 | 15 primitives · 40 MUI components themed · 51 tests; surface area still modest, no Storybook |
| Accessibility | 12% | 8.0 | 135 `aria-labelledby` refs · 0 banned MUI-v6 props · focus-visible parity |
| Foundations (tokens) | 10% | 8.0 | 10/10 token families + 3 schemes + recipes + DATA_VIZ |
| Interaction | 10% | 8.0 | `useScreenActions` in 37 screens · dock contract |
| Visual language | 8% | 8.5 | layer thesis enforced centrally by theme |
| UX heuristics | 8% | 8.0 | 276 `meta.errorTitle` · Nielsen×10 mapped |
| UX laws | 8% | 8.0 | documented per pattern |
| Responsive | 5% | 6.5 | breakpoint tokens; no formal breakpoint audit |
| Documentation | 5% | 8.5 | 10 docs 00–13 + adoption guide + AI-Orchestration UX |
| Developer experience | 5% | 7.5 | 51 tests + VR CI + standalone repo + build; no Storybook/npm |
| Designer experience | 5% | 3.0 | no Figma library/variables |
| Governance | 4% | 8.5 | Constitution + Rulebook + GOVERNANCE + standalone repo + CI |
| Performance | 4% | 6.0 | `sideEffects`; no bundle budget |
| Content design | 3% | 7.5 | verb/error/money/locale enforced |
| Scalability | 3% | 6.5 | schemes + injection; no RTL/i18n |

**Weighted overall = 83.0/100 · Managed** (Components 0.20×7.5=1.50 · Accessibility
0.12×8.0=0.96 · … · Σ = 8.30 → 83). Advancing to "Optimizing" needs roadmap-class
programmes (Figma bridge · RTL · perf budget) — product/design deliverables, not
design defects. **Studio interface detail:** see
[AORMS-STUDIO-INTERFACE-AUDIT](../../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md).

---

## Kit compliance snapshot — 2026-07-12 (evidence-based audit run)

**Question:** is the application using HCW Kit? **Method:** R1–R9 `rg` detection sweeps
over `frontend/src` (reproducible; recipes in the skill +
[HCW-KIT-AI-KNOWLEDGE-BASE.md](../../esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) §2).
**Compliance: 90/100.**

| Check (recipe) | Measured evidence | Verdict |
| --- | --- | --- |
| R1a raw hex `#[0-9a-f]{3,6}` | 15 hits / 3 files — **all sanctioned**: GoogleIconCircle (5, brand) · HcwWordmark (1, brand) · ZonalComplianceCalculator (9, centralised AA-verified SVG palette) | ✓ (1 low → DATA_VIZ tokens) |
| R1b inline `fontSize:` | 54 hits → 51 sanctioned (TYPE_SCALE tokens · mock ×23 · icon geometry · theme-typography fns · `/design-system` specimen); **3 genuine raw-rem-on-text** | ◐ **D18** (3 low) |
| R1c legacy `var(--cds-*)` | 53 hits — frozen compat (StudioAbstract semantic map sanctioned); forbidden in new code | ✓ policy |
| R2 forked status chips | **0 forks** — `dashboardUi.TagChip` delegates to StatusDot; 8 `<Chip>` = outlined/removable/tag (not filled-status) | ✓ closed |
| R4 dock contract | `useScreenActions` in **37 screens** | ✓ strong |
| R5 dialog names | 88 `<Dialog>` sites · 135 `aria-labelledby` refs (D6/D11) | ✓ strong |
| R6 `styled()` | 12 files — mostly HiddenFileInput (sanctioned) | ✓ acceptable |
| R7 banned MUI-v6 props | `primaryTypographyProps`/`InputProps=`/`SelectProps=`: **0** | ✓ clean |
| R8 contextual error titles | `meta.errorTitle` on **276 mutations** | ✓ strong |

**Residual → D18** (3 low raw-fontSize-on-text). [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md).

---

## Agent workflow

1. Read [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md) before UI changes.
2. Run checklist sweeps from [07-UX-REVIEW-CHECKLISTS.md](../07-UX-REVIEW-CHECKLISTS.md).
3. Deposit new findings in the relevant surface audit **or** the debt register.
4. Skill entry point: `.claude/skills/hcw-design-audit/SKILL.md`.
