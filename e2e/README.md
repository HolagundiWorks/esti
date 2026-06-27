# AORMS browser automation (`@esti/e2e`)

Playwright suite that drives the running AORMS app end-to-end: **every login,
every screen, every safe button, and PDF generation.** Standalone npm package
(not in the pnpm workspace) so it installs Playwright independently.

## Prerequisites

The app must be running and reachable. By default it targets the dev demo build
(persona login) on `http://localhost:5173` — the `esti-frontend` container. Point
elsewhere with `AORMS_BASE_URL`.

```bash
cd e2e
npm install
npm run install:browser     # one-time: download chromium
```

## Run

```bash
npm test                    # whole suite (list + HTML report)
npm run test:auth           # all 5 demo personas log in
npm run test:nav            # navigation sweep over every office route
npm run test:buttons        # generic button crawler (every safe button)
npm run report              # open the last HTML report
AORMS_BASE_URL=https://app.example.com npm test   # another environment
```

## What it covers

| Spec | "Tests…" |
|---|---|
| `tests/auth.spec.ts` | **All logins** — each of the 5 demo personas (principal/lead/site/junior/client) signs in. |
| `tests/navigation.spec.ts` | **Every screen** — visits each route in `utils/routes.ts` and asserts it renders (no crash fallback, no bounce to /login). |
| `tests/buttons.spec.ts` | **Every button** — on each screen, clicks every visible *non-destructive* button and asserts the UI never crashes. Destructive/outbound labels are skipped (see the `SKIP` regex). |
| `tests/pdf.spec.ts` | **PDF generation** — triggers the PDF control on PDF-owning screens and waits for a download or a `READY` status (worker round-trip). |

## Extending toward exhaustive coverage

- **More screens:** add the route to `utils/routes.ts` — both the navigation and
  button sweeps pick it up automatically.
- **Item entry (CRUD):** add focused specs that fill a form and submit (the
  crawler deliberately *skips* submit/create/delete so it stays safe; targeted
  CRUD specs assert the create round-trip per module).
- **Per-persona access:** the `loginAs(page, persona)` fixture takes any of the 5
  personas — duplicate the nav sweep per persona to assert role-gated screens.
- **Selectors:** Carbon renders semantic roles; prefer `getByRole` /
  `getByLabel` over CSS. The crawler is a safety net; per-flow specs are the
  precise coverage.

## Notes

- Demo accounts can't upload files or change credentials, so those paths are out
  of scope here.
- PDF generation needs the Python worker running; on a fresh demo DB a screen may
  have no PDF-able rows (reported as a skip, not a failure).
