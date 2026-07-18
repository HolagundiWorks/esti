# Public pages UX fix plan — 2026-07-11

**Source audit:** [PUBLIC-PAGES-UX-AUDIT-2026-07-11.md](PUBLIC-PAGES-UX-AUDIT-2026-07-11.md)

| Phase | IDs | Scope | Status |
| --- | --- | --- | --- |
| **1** | UX1, UX3, UX9, UX10, UX2, UX13 | Credibility, SEO, a11y landmarks | ✅ done |
| **2** | UX4, UX14 | T7 flat tiles + token cleanup | ✅ done |
| **3** | UX6, UX7, UX8 | IA links, recovery, conversion dock | ✅ done |
| **4** | UX5, UX11, UX12 | Cognitive load + rail polish | ✅ done |
| — | UX15–UX17 | Accepted / deferred | no change |
| **5** | UX1 asset, L6 | Investor deck PDF + wiki canonical rail | ✅ done |

## Code changes (phase 5 — 2026-07-11)

| File | Change |
| --- | --- |
| `frontend/public/aorms-investor-deck.html` | Print-ready investor deck (8 slides) |
| `frontend/public/aorms-investor-deck.pdf` | Generated via WeasyPrint (`pnpm build:investor-deck`) |
| `frontend/scripts/generate-investor-deck-pdf-weasy.mjs` | PDF build script (Docker worker) |
| `frontend/scripts/public-pages-smoke.mjs` | Public route smoke test |
| `frontend/src/lib/aorms-surface-urls.ts` | **Revised** — 3 subdomains + platform pages; legacy redirects |
| `frontend/src/lib/wiki-url.ts` | Canonical `aorms.in/wiki` |
| `MarketingRailNav.tsx`, `MarketingFooter.tsx` | Wiki stays `/wiki` (reverted L6 subdomain links) |
| `About.tsx`, `Login.tsx` | Canonical wiki URLs |
| `Investors.tsx` | PDF + HTML + mailto deck links |

**Visual QA:** [PUBLIC-PAGES-VISUAL-QA-2026-07-11.md](PUBLIC-PAGES-VISUAL-QA-2026-07-11.md) — 14/14 smoke pass

| File | Change |
| --- | --- |
| `frontend/src/lib/public-page-seo.ts` | **New** — auth + slug-404 SEO helpers |
| `frontend/src/components/AuthRailLayout.tsx` | `<main id="esti-auth-main">` on rail; external stage `aria-hidden` |
| `frontend/src/lib/marketing-page-nav.ts` | Rail trimmed to 7 pages (design system → footer only) |
| `frontend/src/components/landing/MarketingRailNav.tsx` | Context-aware `brandHref` |
| `frontend/src/components/landing/MarketingShell.tsx` | Wiki brand → `/wiki#top` |
| `frontend/src/components/landing/PlatformLandingSections.tsx` | Trust strip capped at 4 + overflow line |
| `frontend/src/landing.scss` | `flat-card` mixin; tile titles use `--lp2-ink` |
| Auth routes (5) | SEO + `h1` + recover autocomplete + external forgot link |
| `BlogPost`, `WikiPage`, `SeoLanding` | `applyPublicNotFoundSeo` on missing slugs |
| `About.tsx` | Wiki link instead of app library path |
| `Investors.tsx` | Mailto deck request; conversion dock on |
| `AormsConsultancy.tsx` | Conversion dock on |

**UX8 note:** `/design-system` keeps `showConversionDock={false}` per **UX17** (gallery reference page).

**UX17 / UX15 / L6:** unchanged by design.
