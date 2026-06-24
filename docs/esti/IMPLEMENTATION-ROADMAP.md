# AORMS restructure — implementation roadmap

Sequenced to be **non-breaking at each step** and to land foundations before the
things that depend on them. Source designs:
[INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) · [PLANS-AND-TIERS](PLANS-AND-TIERS.md).

| Phase | What | Risk | Depends on |
|---|---|---|---|
| **1. Plan & quota foundation** | `plan` on org settings; `Plan`/`PLAN_LIMITS`/`planAllows` in contracts; `settings.get` exposes plan; quota helper; seed (demo = Enterprise); `usePlan` hook. **No behaviour change yet.** | low | — |
| **2. Enforce tiers** | Apply `planAllows` gates to nav/features; quota checks on create (team/clients/contractors/projects) with upgrade prompts; Lite hides AI. | med | 1 |
| **3. Project two-head refactor** | ProjectDetail → **Consultancy \| Project Management** heads; BOQ moves to PM; billing in-project. | med | — |
| **4. Single Costing & Measurement window** | Consolidate estimates + measurement + BBS + running bills into one staged workspace on a shared item/rate spine. | med-high | 3 |
| **5. Global nav restructure** | The 9 areas; Programme/PMC become read-only **portfolio** rollups; Tenders/Construction leave "Office". | med | 3 |
| **6. Rate analysis capability** | New composite-rate build-up (material+labour+machinery+overhead) feeding the rate-book library and the costing window. | high (new) | 4 |
| **7. Cleanup** | Drop bylaw from product nav (keep public `/compliance-check` SEO tool); persistent spec→rate-book mapping; marketing rename decision. | low | — |

## Locked assumptions
- Demo = **Enterprise**; new firms default **Lite**.
- Lite keeps **basic GST invoicing**; reconciliation/filing are Core.
- Core = **25 seats** + add-seats.
- Public **`/compliance-check`** stays as a marketing tool; bylaw leaves the product nav.
- Marketing copy keeps "DSR"; the app says "Rate Books".
- **Rate analysis** is net-new (Phase 6).

## Phase 1 — deliverables (this pass)
1. `orgSettings.plan` (`LITE|CORE|ENTERPRISE`, default `LITE`) + migration.
2. `packages/contracts/src/plans.ts` — `Plan`, `PLAN_LIMITS`, `PLAN_FEATURES`,
   `planAllows(plan, feature)`, `withinQuota(plan, kind, current)`.
3. `settings.get` returns `plan`; `firm.get` too (for display).
4. `backend/src/trpc/trpc.ts` — `assertPlanFeature` / quota helper (wired in Phase 2).
5. Seed: demo org → `ENTERPRISE`.
6. Frontend `usePlan()` hook + nothing gated yet (Phase 2 applies gates).
