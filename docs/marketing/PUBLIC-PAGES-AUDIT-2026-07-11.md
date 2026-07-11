# Public pages & URL audit — tracked issues

**Audit date:** 2026-07-11 · **Scope:** Unauthenticated marketing, docs, auth, and utility surfaces (`VITE_PUBLIC_SITE !== "false"`).

Canonical surface map: [`docs/esti/AORMS-SURFACE-URLS.md`](../esti/AORMS-SURFACE-URLS.md).

**Inventory (approx.):** 8 frozen hosts · 18 core routes · 30 SEO landings · 31 blog posts · 10 wiki articles · 6 auth flows.

---

## Issue tracker

Status: `open` · `in_progress` · `done` · `wontfix` · `deferred`

| ID | Sev | Status | URL / area | Category | Description | Recommendation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **C1** | Critical | done | `/*` unknown on platform | UX / SEO | Unknown paths rendered **Landing** (soft-404) | **`NotFound`** route | — |
| **C2** | Critical | done | `/demo` | Cross-link | Linked 30+ times; no route | Redirect → `/login`; content links updated | — |
| **H1** | High | done | Wiki canonical | SEO | Sitemap/prerender used `aorms.in/wiki` | `WIKI_BASE` = `wiki.aorms.in` | — |
| **H2** | High | done | Wiki content | Docs | Dead **`estimation-and-boq`** links | Removed; wiki index synced | — |
| **H3** | High | done | `public/sitemap.xml` | SEO | Stale committed sitemap | **Prerender copies** to `public/sitemap.xml` on every build | — |
| **H4** | High | done | Footer `/demo` | Nav | Broken demo URL in footer | Sign in `/login` | — |
| **H5** | High | done | `/login` | SEO / perf | Studio marketing not prerendered | **`dist/login/index.html`** at build | — |
| **M1** | Medium | done | All public | Analytics | No analytics | Optional **Plausible** via `VITE_PLAUSIBLE_DOMAIN` | — |
| **M2** | Medium | wontfix | — | Legal | No cookie banner | Plausible is cookieless; privacy in `/legal` §5 | — |
| **M3** | Medium | done | `/about` | IA | Orphan page | Footer + **marketing rail** | — |
| **M4** | Medium | done | `/aorms-consultancy` | SEO | Missing from sitemap | In prerender sitemap | — |
| **M5** | Medium | done | Blog | SEO | No RSS | **`/blog/feed.xml`** (build + `public/`) | — |
| **M6** | Medium | done | Prerender `/` | Content | Stale hero copy | Updated in prerender | — |
| **M7** | Medium | done | SEO landings | Content | CTAs → `/demo` | → `/login` | — |
| **L1** | Low | deferred | — | Status | No status page | External / future | — |
| **L2** | Low | deferred | — | API | No public API docs | Developer portal (future) | — |
| **L3** | Low | deferred | — | Careers | No careers page | When hiring | — |
| **L4** | Low | done | `/contact` | IA | mailto only | **`/contact` → `/about#contact`** | — |
| **L5** | Low | done | — | A11y | No accessibility statement | **`/legal#accessibility`** §10 | — |
| **L6** | Low | open | Rail wiki link | Nav | `/wiki` path alias vs `wiki.aorms.in` | Canonical in SEO/meta only; path kept for SPA | — |
| **L7** | Low | wontfix | — | i18n | English only | v1 intentional | — |

---

## Fix log

| Date | IDs | Notes |
| --- | --- | --- |
| 2026-07-11 | C1, C2, H1–H2, H4, M3–M4, M6–M7 | First audit pass: NotFound, demo redirect, wiki canonical, estimation refs, footer |
| 2026-07-11 | H3, H5, M1, M5, L4–L5 | Autopilot: login prerender, sitemap sync, RSS, Plausible hook, About rail, contact alias, legal a11y |

---

## Build outputs (public site)

After `pnpm build` in `frontend/`:

| Asset | Path |
| --- | --- |
| Sitemap | `dist/sitemap.xml` + synced `public/sitemap.xml` |
| RSS | `dist/blog/feed.xml` + `public/blog/feed.xml` |
| Login shell | `dist/login/index.html` |
| Wiki / blog / landings | `dist/**/index.html` |

**Analytics:** set `VITE_PLAUSIBLE_DOMAIN=aorms.in` before frontend build (see `deploy/.env.production.example`).

---

## Related

- [`LANDING-REDESIGN-CONTEXT.md`](LANDING-REDESIGN-CONTEXT.md)
- [`docs/esti/AORMS-PLATFORM-NOMENCLATURE.md`](../esti/AORMS-PLATFORM-NOMENCLATURE.md)
