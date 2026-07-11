# HCW Kit — documentation hierarchy

**The map of the design system's knowledge.** Governance order:
[Playbook](../HCW-DESIGN-PLAYBOOK.md) (why) → [Constitution](00-CONSTITUTION.md)
(law) → this hierarchy (how/what/state). Numbered sections index the canonical
document(s) — some live here, some in their historical homes (links are canonical;
files are not duplicated).

| # | Section | Canonical document(s) |
| --- | --- | --- |
| **00** | **Vision** | [HCW-DESIGN-PLAYBOOK.md](../HCW-DESIGN-PLAYBOOK.md) · [00-CONSTITUTION.md](00-CONSTITUTION.md) · brand heritage: [AORMS-BRANDING-KIT.md](../esti/AORMS-BRANDING-KIT.md) |
| **01** | **Foundations** | [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md) (layers · shape · type · motion · spatial model) |
| **02** | **Tokens** | `packages/hcw-ui-kit/src/tokens.ts` (executable) · [02-TOKEN-GOVERNANCE.md](02-TOKEN-GOVERNANCE.md) |
| **03** | **Components** | `packages/hcw-ui-kit/src/` + [CHANGELOG](../../packages/hcw-ui-kit/CHANGELOG.md) · [03-COMPONENT-QUALITY-CHECKLIST.md](03-COMPONENT-QUALITY-CHECKLIST.md) |
| **04** | **Patterns** | [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md) §ActionDock/§Rail · [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) §6–7 |
| **05** | **Templates** | *(gap — dashboard/admin/report/detail templates; see Roadmaps)* |
| **06** | **Portal layouts** | [MONOREPO-AND-SURFACES.md](../esti/MONOREPO-AND-SURFACES.md) · [NAVIGATION.md](../esti/NAVIGATION.md) · [AORMS-SURFACE-URLS.md](../esti/AORMS-SURFACE-URLS.md) |
| **07** | **UX rules** | [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) (laws) · [07-UX-REVIEW-CHECKLISTS.md](07-UX-REVIEW-CHECKLISTS.md) (measurable) |
| **08** | **Accessibility** | [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) §8 · rule R6 in the [AI knowledge base](../esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) |
| **09** | **DesignOps** | [GOVERNANCE.md](../../packages/hcw-ui-kit/GOVERNANCE.md) (contribution · semver · deprecation) |
| **10** | **MUI integration** | [10-MUI-MAPPING.md](10-MUI-MAPPING.md) — every MUI component → HCW treatment |
| **11** | **Audits** | [MATURITY-2026-07-11.md](11-audits/MATURITY-2026-07-11.md) · [COMPLIANCE-2026-07-11.md](11-audits/COMPLIANCE-2026-07-11.md) · **living:** [DESIGN-DEBT-REGISTER.md](11-audits/DESIGN-DEBT-REGISTER.md) |
| **12** | **AI agent rules** | [12-AI-AGENT-RULEBOOK.md](12-AI-AGENT-RULEBOOK.md) (permanent behaviour) · [HCW-KIT-AI-KNOWLEDGE-BASE.md](../esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) (contract + recipes) · skill: `.claude/skills/hcw-design-audit` |
| **13** | **Roadmaps** | [AORMS-UI-AUTOPILOT-ROADMAP.md](../esti/AORMS-UI-AUTOPILOT-ROADMAP.md) · program tracker artifact (URL in KB §6) |

## Reading order for a new agent (human or AI)

1. [Playbook](../HCW-DESIGN-PLAYBOOK.md) — why the rules exist.
2. [Constitution](00-CONSTITUTION.md) — the law.
3. [Rulebook](12-AI-AGENT-RULEBOOK.md) — your permanent operating manual.
4. [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md) + [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) — the system itself.
5. [Debt register](11-audits/DESIGN-DEBT-REGISTER.md) — current state before touching anything.
