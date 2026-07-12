# Public pages UI/UX audit — tracked issues

**Audit date:** 2026-07-11 (fresh pass) · **Scope:** **Pages only** — unauthenticated
marketing, content, auth, and utility routes on the public SPA (`VITE_PUBLIC_SITE !== "false"`).
**Out of scope:** AORMS-Studio workspace, account/licensing consoles, external/client/consultant/
site portals, Knowledge Bank portal (staff apps).

**Method:** Static code review against [`07-UX-REVIEW-CHECKLISTS.md`](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md),
[`HCW-UI-UX-PRINCIPLES.md`](../esti/HCW-UI-UX-PRINCIPLES.md), and marketing template **T7**
[`05-TEMPLATES.md`](../hcw-kit/05-TEMPLATES.md). **Audit only — no fixes in this pass.**

**Companion:** [PUBLIC-PAGES-AUDIT-2026-07-11.md](PUBLIC-PAGES-AUDIT-2026-07-11.md) (URL/SEO pass) ·
[11-audits/README.md](../hcw-kit/11-audits/README.md)

---

## Executive summary

| Area | Score | Verdict |
| --- | --- | --- |
| Marketing shell (T7) | 75% | ✅ Mature chrome; ◐ flat-tile layer debt |
| Navigation & IA | 62% | ◐ 8-item rail at Miller ceiling; auth off-shell |
| Forms & auth UX | 75% | ✅ Labels/autocomplete on login; ◐ recovery gaps |
| SEO & metadata | 78% | ✅ Marketing strong; ◐ auth + content 404s |
| Accessibility | 55% | ◐ Auth skip/landmarks; hidden external stage |
| Error / empty states | 85% | ✅ Honest copy; ◐ 404 SEO on slug routes |
| Design-system compliance (T7 layers) | 40% | ❌ Glass on content tiles (`frost-card`) |

**Overall: 71 / 100 — partial pass** *(pre-fix baseline)* · **~88 / 100 post-fix** *(UX1–UX14 code complete; visual QA pending)*.

---

## Route inventory (pages only)

| Route | Component | Shell | Title / SEO | h1 | Conversion dock |
| --- | --- | --- | --- | --- | --- |
| `/` | `Landing` | `MarketingShell` | `applyLandingSeo()` | ✅ | ✅ |
| `/login` | `Login` + `ArchitectureLoginStage` | `AuthRailLayout` + SectionDock | Stage SEO | ✅ (stage) | ❌ |
| `/aorms-consultancy` | `AormsConsultancy` | `MarketingShell` | `applyConsultancyLandingSeo()` | ✅ | ❌ `showConversionDock={false}` |
| `/about` | `About` | `MarketingShell` | Manual + JSON-LD | ✅ | ✅ |
| `/investors` | `Investors` | `MarketingShell` | Manual | ✅ | ❌ |
| `/legal` | `Legal` | `MarketingShell` | Manual | ✅ | ✅ |
| `/design-system` | `DesignSystem` | `MarketingShell` | Manual | ✅ | ❌ |
| `/blog` | `Blog` | `MarketingShell` | `applyBlogListSeo()` | ✅ | ✅ |
| `/blog/:slug` | `BlogPost` | `MarketingShell` | Post SEO; **404: none** | ✅ / 404 | ✅ |
| `/wiki` | `Wiki` | `MarketingShell` (wiki rail) | `applyWikiListSeo()` | ✅ | ✅ |
| `/wiki/:slug` | `WikiPage` | `MarketingShell` | Page SEO; **404: none** | ✅ / 404 | ✅ |
| `/:seo-slug` (×30) | `SeoLanding` | `MarketingShell` | If found; **404: none** | ✅ / 404 | ✅ |
| `*` | `NotFound` | `MarketingShell` | Title + `noindex` | ✅ | ✅ |
| `/development` | — | Redirect → `/wiki/aorms-studio` | — | — | — |
| `/download` | — | Redirect → `/wiki/getting-started` | — | — | — |
| `/contact` | — | Redirect → `/about#contact` | — | — | — |
| `/demo` | — | Redirect → `/login` | — | — | — |
| `/signup` | `Signup` | `AuthRailLayout` | **None** | ❌ (`<p>`) | ❌ |
| `/forgot-password` | `ForgotPassword` | `AuthRailLayout` | **None** | ❌ (`h3`) | ❌ |
| `/reset-password` | `ResetPassword` | `AuthRailLayout` | **None** | ❌ (`h3`) | ❌ |
| `/recover` | `RecoverWithBackupCode` | `AuthRailLayout` | **None** | ❌ (`h2`) | ❌ |
| `/access` | `ExternalLogin` | `AuthRailLayout` (`external`) | **None** | ❌ (stage hidden) | ❌ |

**Note:** `AormsArchitecture` is not a separate route — studio marketing lives on `/login`
stage via `ArchitectureLoginStage.tsx`. `DevelopmentDoc` and `Download` are redirects only.

---

## Checklist results (applicable sections)

### Navigation — 5/8 pass

| Item | Pass? | Evidence |
| --- | --- | --- |
| Chrome matches IA | ◐ | 8 rail pages `marketing-page-nav.ts:20-28`; investors orphan (by design) |
| Menu ≤7±2 with grouping | ◐ | 8 items, no `ListSubheader` |
| Active route `aria-current` | ✅ | `MarketingRailNav.tsx:99-109` |
| Every route `document.title` | ◐ | Auth except `/login` stage SEO |
| Breadcrumb deeper routes | N/A | Marketing uses rail, not breadcrumbs |
| Keyboard menus | ✅ | MUI rail + SectionDock |
| Search Ctrl/Cmd-K | N/A | Public pages |
| Serial position | ✅ | Platform first in rail |

### Forms — 6/8 pass

| Item | Pass? | Evidence |
| --- | --- | --- |
| Programmatic labels | ✅ | Auth fields labelled (`Login.tsx`, etc.) |
| Required + inline validation | ✅ | Login tenant step, password errors |
| Client mirrors server | ◐ | Signup no min-length pre-check |
| autoComplete | ◐ | Recover backup code missing `autoComplete` |
| Submit disables while pending | ✅ | `disabled={mutation.isPending}` pattern |
| Error text actionable | ✅ | tRPC + `meta.errorTitle` on mutations |
| Escape/Cancel honest | ✅ | Back links on auth flows |
| Logical field order | ✅ | |

### Dialogs — N/A

No dialogs on scoped public pages.

### Notifications — 2/2 pass

Inline `Alert` on auth errors; no duplicate toast stacks on marketing routes.

### T7 marketing template — 2/6 pass

| Item | Pass? | Evidence |
| --- | --- | --- |
| MarketingShell + clear rail | ✅ | `MarketingShell.tsx` |
| SectionDock scroll-spy | ✅ | Platform, consultancy, design-system |
| heading-glass section heads | ✅ | `lp2-section-head` pattern |
| **FLAT sub-cards** | ❌ | `.lp2-tile` uses `@include frost-card` `landing.scss:7073` |
| Contours atmosphere | ✅ | `contours` prop |
| Single `#lp2-main` | ✅ | `MarketingShell.tsx:173-174` |

---

## Issue tracker

Status: `open` · `done` · `accepted` · `deferred` · `wontfix`

| ID | Sev | Status | URL / area | Category | Finding | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| **UX1** | High | done | `/investors` | Content | Pitch deck link 404 — `/aorms-investor-deck.pdf` not in `public/` | **`aorms-investor-deck.pdf`** + HTML deck |
| **UX2** | High | done | Auth routes | A11y | Skip link targets `#esti-auth-main` (stage), not form rail | Skip to rail form or wrap rail in `<main>` `AuthRailLayout.tsx:31-32,91-93` |
| **UX3** | High | done | `/signup`, `/forgot-password`, `/reset-password`, `/recover`, `/access` | SEO | No `document.title` / meta | Per-route SEO helpers (pattern: `architecture-landing-seo.ts`) |
| **UX4** | Medium | done | Marketing tiles | T7 / layers | Sub-cards use glass (`frost-card`), not flat | Flat tiles per T7; glass on chrome/CTAs only `landing.scss:7055-7078` |
| **UX5** | Medium | done | `/` trust strip | Cognitive load | 7 fragmented-tool chips (Miller >4) | Cap at 4 or group `product-nomenclature.ts:18-26`, `PlatformLandingSections.tsx:78-81` |
| **UX6** | Medium | done | `/about` | Nav | Public copy links authenticated path `/libraries/spec-catalog` | Link to wiki/public doc `About.tsx:173` |
| **UX7** | Medium | done | `/access` | Forms | No forgot-password / recovery path | Add recovery link (cf. `Login.tsx:360-367`) |
| **UX8** | Medium | done | `/aorms-consultancy`, `/investors`, `/design-system` | Conversion | `showConversionDock={false}` — no Sign in CTA in dock | Re-enable dock or inline primary CTA |
| **UX9** | Medium | done | `/blog/:slug`, `/wiki/:slug`, SEO 404 | SEO | Missing title + `noindex` on not-found slugs | Mirror `NotFound.tsx:8-19` pattern |
| **UX10** | Medium | done | Auth (non-login) | A11y | No page-level `h1`; headings skip levels | One visible `h1` per auth route |
| **UX11** | Low | done | Marketing rail | Navigation | 8 items at 7±2 ceiling | Group or drop one item |
| **UX12** | Low | done | Rail brand | Navigation | Logo always `/#top` regardless of context | Context-aware home on wiki host |
| **UX13** | Low | done | `/recover` | Forms | Backup code field lacks `autoComplete` | `one-time-code` or documented exception |
| **UX14** | Low | done | `landing.scss` | Tokens | Hardcoded `#1a0e08` on glass tile titles | Use `--lp2-ink` / kit tokens `landing.scss:7113-7114` |
| **UX15** | Low | accepted | Auth routes | Shell | No `MarketingShell` rail — form-in-rail is intentional (T5) | Optional slim rail for cross-page nav only |
| **UX16** | Low | accepted | `/access` stage | A11y | `AuthStageCanvas` `aria-hidden` on external variant | Duplicate headline in rail if stage must stay decorative |
| **UX17** | Low | deferred | `/design-system` | T7 | Page demos glass intentionally (reference gallery) | Keep; do not copy pattern to product tiles |

**Carried from URL audit:** **L6** — wiki lives at `/wiki` on aorms.in; only **admin**, **studio**, and **consultancy** remain as subdomains.
([PUBLIC-PAGES-AUDIT](PUBLIC-PAGES-AUDIT-2026-07-11.md#issue-tracker)).

---

## Per-route notes

### Marketing

- **`/`** — Strong hero, SectionDock, FAQ `<details>`. Friction: UX5 trust strip, UX4 glass tiles.
- **`/login`** — T5 auth split correct; studio marketing on stage with SEO. SectionDock without
  marketing rail. Tenant picker dense on small viewports.
- **`/aorms-consultancy`** — Full story; roadmap badge clear. No conversion dock (UX8).
- **`/about`, `/legal`** — Solid prose; accessibility statement in legal §10. About library link (UX6).
- **`/investors`** — Orphan page; broken deck (UX1); no dock (UX8).
- **`/design-system`** — Living kit gallery; dock off acceptable for reference (UX17).

### Content

- **`/blog`** — Empty state OK. Post 404 lacks SEO (UX9).
- **`/wiki`** — Good hub; wiki rail reorder. Article 404 SEO gap (UX9).
- **SEO landings** — Pattern consistent; 404 branch needs SEO (UX9).

### Auth

- **`/login`** — Best form UX in scope (labels, autocomplete, pending verbs, Google OAuth).
- **`/signup`** — Bootstrap only; no title/h1 (UX3, UX10).
- **`/forgot-password`, `/reset-password`** — Good success paths; no metadata (UX3).
- **`/recover`** — Clear success with new code display.
- **`/access`** — Minimal portal sign-in; no recovery (UX7); stage hidden from AT (UX16).

---

## Scorecard by module

| Module | Shell | SEO | A11y | T7 layers | Forms |
| --- | --- | --- | --- | --- | --- |
| Platform `/` | ✅ | ✅ | ✅ | ◐ UX4 UX5 | N/A |
| Studio `/login` | ✅ T5 | ✅ | ◐ UX2 | ✅ | ✅ |
| Consultancy | ✅ | ✅ | ✅ | ◐ UX4 | N/A |
| About / Legal | ✅ | ✅ | ✅ | ◐ UX4 | N/A |
| Investors | ✅ | ✅ | ✅ | ◐ UX4 | N/A |
| Design system | ✅ | ✅ | ✅ | ✅ (demo) | N/A |
| Blog / Wiki | ✅ | ◐ UX9 | ✅ | ◐ UX4 | N/A |
| SEO landings | ✅ | ◐ UX9 | ✅ | ◐ UX4 | N/A |
| Auth (other) | ✅ T5 | ❌ UX3 | ❌ UX2 UX10 | ✅ | ◐ UX7 UX13 |
| NotFound | ✅ | ✅ | ✅ | ◐ UX4 | N/A |

---

## Recommended fix order

1. **UX1** — Investor deck 404 (trust / credibility)
2. **UX3, UX9, UX10** — Metadata and heading hygiene (quick wins)
3. **UX2** — Auth skip / landmark fix (WCAG)
4. **UX4, UX14** — T7 flat tiles + token cleanup (visual policy)
5. **UX6, UX7, UX8** — IA links, recovery path, conversion dock
6. **UX5, UX11, UX12** — Cognitive load polish

---

## Fix log

| Date | IDs | Notes |
| --- | --- | --- |
| 2026-07-11 | — | Fresh public-pages UI/UX audit (pages only; no app surfaces; audit-only) |
| 2026-07-11 | UX1–UX14 | Fix pass: `public-page-seo.ts`, auth landmarks, flat tiles, rail trim, conversion dock |

**Fix plan:** [PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md](PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md)

---

## Related

- [PUBLIC-PAGES-AUDIT-2026-07-11.md](PUBLIC-PAGES-AUDIT-2026-07-11.md)
- [AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md](../esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md) (workspace — out of scope here)
- [LANDING-REDESIGN-CONTEXT.md](LANDING-REDESIGN-CONTEXT.md)
- [AORMS-SURFACE-URLS.md](../esti/AORMS-SURFACE-URLS.md)
