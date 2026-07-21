# Landing page redesign — agent context

**Status:** Canonical brief · **Updated:** 2026-07-11 · **Owner:** HCW

Another agent or designer may own visual/layout work on the public landing. This
file captures **product and documentation context** so copy, IA, and SEO stay
aligned with the platform rebrand.

---

## What changed (2026-07)

| Before | After |
| --- | --- |
| AORMS = *Architecture Office Resource Management System* | AORMS = **Accelerated Operational Resources Management System** (platform) |
| Landing = architecture-practice marketing | Landing = **pre-release platform development documentation** |
| Single product story | Platform story + **two AEC apps**: **AORMS-Studio** (architecture, shipping) and **AORMS-Consultancy** (engineering, roadmap) |

Full naming rules: [AORMS-PLATFORM-NOMENCLATURE.md](../esti/AORMS-PLATFORM-NOMENCLATURE.md).

---

## Landing purpose (current direction)

The home route (`/`) presents **AORMS Development Documentation** — Version 1.0
pre-release architecture and technical specification:

- Mission: consolidate consulting workflows (5–7 tools → one AI-enhanced platform)
- **EOMS** (knowledge bank) + **ESTI** (internal AI agent)
- Feature modules, stack, roadmap
- Target: **AEC consulting firms** 5–500 people — architecture and engineering practices

**Source markdown (bundled at build):**
`frontend/src/content/aorms-development-spec.md`

**Rendered by:** `MarketingHero.tsx`, `MarketingShell.tsx`, markdown body
components on the landing route.

**SEO:** `frontend/src/lib/landing-seo.ts` — titles/descriptions already use
*Accelerated Operational Resources Management System*.

---

## What NOT to put on the platform landing

These belong to **AORMS-Studio** (vertical), not the platform doc landing:

- India-only GST/TDS/COA fee recovery deep dives (keep in wiki/blog)
- “Built for Indian architects” as the **primary** headline (fine as one vertical callout)
- Architecture ERP / BBMP / drawing-register feature lists as if they are the whole product
- Duplicate CTAs in the rail — **ActionDock only** ([HCW-UI-KIT.md](../esti/HCW-UI-KIT.md))

---

## Shell & design system (do not reinvent)

| Concern | Canonical reference |
| --- | --- |
| UX audit checklist | [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md) — laws, cognitive load, marketing review |
| Spatial model | Rail · Stage · Dock — [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md) |
| Design system page | `/design-system` — `DesignSystemPage.tsx` |
| Tokens / layers | `@hcw/ui-kit` — flat · soft · glass |
| Marketing rail | `MarketingShell.tsx` + `MarketingRailNav.tsx` — glass floating rail (open / collapsed); `landing.scss` |
| Brand mark | `AormsLogo`, `HcwWordmark` in rail |
| Contours / atmosphere | `landing.scss`, `LandingContours.tsx` |

**`@carbon/react` is removed.** MUI + `@hcw/ui-kit` only.

---

## Routes (marketing surface)

| Path | Role |
| --- | --- |
| `/` | **Platform marketing landing** (implemented) |
| `/login`, `/demo` | **AORMS-Studio** staff sign-in (marketing + workspace entry; legacy slugs redirect here) |
| `/aorms-consultancy` | **AORMS-Consultancy** engineering app marketing (roadmap) |
| `/access` | **External portals** — client, consultant, contractor, site (`AORMS_PORTALS.external`) |
| `/account`, `/company-account` | **AORMS account** + **Company account** |
| `/platform-admin` | **Licensing console** (operators) |
| `/development` | Full technical specification (markdown) |
| `/design-system` | HCW-UI-Kit public specimen |
| `/blog`, `/wiki` | Editorial + user docs on **aorms.in** |

**Subdomains** — see [AORMS-SURFACE-URLS.md](../esti/AORMS-SURFACE-URLS.md):

| Host | Surface |
| --- | --- |
| `aorms.in` | Platform marketing + path-based pages (wiki, account, access, …) |
| `studio.aorms.in` | **AORMS-Studio** workspace SPA |
| `consultancy.aorms.in` | **AORMS-Consultancy** marketing |
| `admin.aorms.in` | Licensing console |

Retired hosts (`wiki.`, `kbank.`, `external.`, `account.`) **301 → aorms.in** paths.

---

## Implementation files (touch list)

| File | Notes |
| --- | --- |
| `frontend/src/components/landing/MarketingHero.tsx` | Hero headline/sub — platform doc |
| `frontend/src/components/landing/MarketingShell.tsx` | Rail nav, dock CTAs |
| `frontend/src/content/aorms-development-spec.md` | Body markdown — sync with docs |
| `frontend/src/lib/landing-seo.ts` | Meta, JSON-LD |
| `frontend/src/lib/aorms-development-spec.ts` | Strips title block; nav anchors |
| `frontend/src/landing.scss` | Marketing styles |
| `frontend/index.html` | `alternateName` in schema |
| `frontend/public/llms.txt` | LLM crawl summary |

After substantive landing copy changes, update:

- [AORMS-DEVELOPMENT-SPEC.md](../esti/AORMS-DEVELOPMENT-SPEC.md) (pointer)
- [AORMS-PLATFORM-NOMENCLATURE.md](../esti/AORMS-PLATFORM-NOMENCLATURE.md) if naming shifts

---

## Voice & positioning

- **Platform:** operational spine, consolidation, workflow frameworks, audit-first AI
- **Tone:** precise, technical-spec energy on landing; warm HCW brand in rail/footer
- **ESTI:** intelligence layer inside workspaces — not the product name users buy
- **HCW:** Human Centric Works — studio behind the kit and AORMS

---

## Open questions (coordinate with product)

- Dedicated **`aorms-studio`** marketing URL or subdomain (TBD)
- How much architecture vertical story stays on `/` vs wiki/blog
- GraphQL / WebSocket / pgvector in north-star vs shipped Fastify+tRPC stack — label north-star clearly as **target**, not **shipped**
