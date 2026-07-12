# Public pages visual QA — 2026-07-11

**Scope:** Landing and allied public routes only (no Studio app).

**Method:** Automated smoke (`pnpm smoke:public`) against Vite dev server + static asset checks. SPA routes assert shell delivery (`#root`); prerendered/build routes can add content markers in CI.

---

## Smoke results (2026-07-11)

Run: `node scripts/public-pages-smoke.mjs http://localhost:5173`

| Route | Result | Notes |
| --- | --- | --- |
| `/` | ✅ PASS | SPA shell |
| `/login` | ✅ PASS | SPA shell |
| `/signup` | ✅ PASS | SPA shell |
| `/forgot-password` | ✅ PASS | SPA shell |
| `/access` | ✅ PASS | SPA shell |
| `/about` | ✅ PASS | SPA shell |
| `/investors` | ✅ PASS | SPA shell + deck links |
| `/legal` | ✅ PASS | SPA shell |
| `/blog` | ✅ PASS | SPA shell |
| `/wiki` | ✅ PASS | SPA shell |
| `/aorms-consultancy` | ✅ PASS | SPA shell |
| `/aorms-investor-deck.html` | ✅ PASS | Static deck HTML |
| `/aorms-investor-deck.pdf` | ✅ PASS | `%PDF` header |
| `/does-not-exist-404` | ✅ PASS | SPA shell (NotFound client-side) |

**14/14 passed**

---

## Manual checklist (browser)

| Check | Status |
| --- | --- |
| Platform hero + conversion dock on `/` | Manual |
| Rail 7 items; wiki at `/wiki` on aorms.in | Manual |
| Auth skip link → `#esti-auth-main` | Manual |
| Investors: PDF download + mailto | Manual |
| Flat tiles (no glass on content cards) | Manual |

---

## Related

- [PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md](PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md)
- [PUBLIC-PAGES-AUDIT-2026-07-11.md](PUBLIC-PAGES-AUDIT-2026-07-11.md)
