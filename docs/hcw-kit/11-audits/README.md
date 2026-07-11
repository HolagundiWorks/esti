# HCW Kit & AORMS — audit index

**Updated:** 2026-07-12 · **Living queue:** [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md) — **Open queue empty (audit·fix program complete)** · Canonical kit repo: **github.com/HolagundiWorks/hcwux**

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

## Kit maturity snapshot — 2026-07-12 (program close-out)

**Method:** 16-section framework, evidence-based static analysis (`file:line`).
**Overall: ~78/100 — "Managed"** *(post visual sign-off; regression harnesses now
complete — 51 kit unit tests + Playwright VR in CI). The remaining ceiling is
**roadmap-class, not design debt**: Figma library/variables, RTL/i18n, bundle budget,
formal breakpoint audit.*

| Area | Score /10 | One-line basis |
| --- | --- | --- |
| Foundations (tokens) | 7.5 | colour/recipe layer + scale ladders + scheme tokens |
| Visual language | 8.5 | coherent thesis, enforced centrally by theme |
| Components | 7.5 | thin primitive set; all canonicals promoted + tested |
| Interaction patterns | 8.0 | dock contract + shells widely adopted |
| Accessibility | 8.0 | focus parity + gates; all dialog names fixed (D6/D11) |
| Responsive | 6.5 | rail stack works; no formal breakpoint audit (roadmap) |
| UX heuristics | 8.0 | principles doc maps Nielsen×10 to shipped patterns |
| UX laws | 8.0 | laws are design inputs, documented per pattern |
| Documentation | 8.5 | full hierarchy + governance + adoption + AI-orchestration UX |
| Developer experience | 7.5 | 51 unit tests + VR in CI; living gallery; standalone repo |
| Designer experience | 3.0 | no Figma library/variables (roadmap) |
| Governance | 8.5 | semver + CHANGELOG + GOVERNANCE + standalone hcwux repo + CI |
| Performance | 6.0 | sideEffects; no bundle budget yet |
| Content design | 7.5 | verb/error/money/locale rules enforced |
| Scalability | 6.5 | scheme layer + injection; RTL/i18n absent (roadmap) |

**Level:** **Managed** — documented, enforced, and regression-guarded (unit + VR).
Advancing to "Optimizing" needs the roadmap-class programmes (Figma bridge, RTL,
perf budget), which are product/design deliverables, not design defects.
**Studio interface detail:** see
[AORMS-STUDIO-INTERFACE-AUDIT](../../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md).

---

## Kit compliance snapshot — 2026-07-12

**Question:** is the application using HCW Kit? **Method:** R1–R9 detection sweeps
(recipes in [HCW-KIT-AI-KNOWLEDGE-BASE.md](../../esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) §2).
**Compliance: ~92/100** — the two open gaps at the prior audit (D4 hex targets, D11
TagChip fork) are both now closed.

| Check | Evidence | Verdict |
| --- | --- | --- |
| Token compliance — hex | PlanReader + ZonalCompliance tokenised (`DATA_VIZ`); residual hits sanctioned (canvas/SVG, brand) | ✓ closed (D4) |
| Token compliance — inline fontSize | real-text drift fixed (TYPE_SCALE) | ✓ closed |
| Token compliance — legacy `--cds-*` | frozen compat; forbidden in new code | ✓ policy |
| Component compliance — status | filled chips eliminated; StatusDot canonical | ✓ closed |
| Component compliance — duplicates | `Clients.tsx` TagChip fork → kit `StatusDot` | ✓ closed (D11) |
| Layout compliance | RailLayout 48 · MarketingShell 15 · AuthRail 12 · PortalShell 9 · ExternalPortal 5 | ✓ strong |
| Interaction compliance | useScreenActions 26+ screens; `[]`-while-dialog honoured | ✓ strong |
| Accessibility compliance | dialog names complete incl. `Clients.tsx` (D6/D11); WCAG 2.2 AA gates | ✓ closed |
| Custom styling (`styled()`) | mostly HiddenFileInput (sanctioned) | ✓ acceptable |

**Open items → none.** [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md) Open queue is empty.

---

## Agent workflow

1. Read [DESIGN-DEBT-REGISTER.md](DESIGN-DEBT-REGISTER.md) before UI changes.
2. Run checklist sweeps from [07-UX-REVIEW-CHECKLISTS.md](../07-UX-REVIEW-CHECKLISTS.md).
3. Deposit new findings in the relevant surface audit **or** the debt register.
4. Skill entry point: `.claude/skills/hcw-design-audit/SKILL.md`.
