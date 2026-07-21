# AORMS browser automation (`@esti/e2e`)

Playwright suite that drives the running AORMS app end-to-end: **every login,
every screen, every safe button, and PDF generation.** Standalone npm package
(not in the pnpm workspace) so it installs Playwright independently.

## Prerequisites

The app must be running and reachable. By default it targets the demo build on
`http://localhost:5173` (seeded with `pnpm seed:demo`). Point elsewhere with
`AORMS_BASE_URL`. Demo users sign in with email + password (`demo1234` unless
`SEED_DEMO_PASSWORD` is set) — there is no persona picker on `/login`.

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
| `tests/auth.spec.ts` | **All logins** — staff personas via `/login` + Open workspace; client via `/access`. |
| `tests/navigation.spec.ts` | **Every screen** — visits each route in `utils/routes.ts` and asserts it renders (no crash fallback, no bounce to /login). |
| `tests/navigation-personas.spec.ts` | **Every role** — Project Lead + Jr Architect sweep every office route crash-free (role-gated screens may redirect, never blow up); Client reaches the portal via `/access`. |
| `tests/buttons.spec.ts` | **Every button** — on each screen (one test per route, reuses the saved session from setup — runs *before* office re-logins that revoke that session), clicks every visible *non-destructive* button and asserts the UI never crashes. Destructive/outbound labels are skipped (see the `SKIP` regex). |
| `tests/crud.spec.ts` | **Each item entered** — a real create round-trip per module (clients, leads, consultants, contractors, contracts, invoices, proposals, letters, office expenses): opens the New-X modal, fills it via `fixtures/crud.ts`, submits, and verifies either the `E2E …`-stamped record lands in the list or (for auto-numbered docs) the modal closes cleanly. |
| `tests/crud-lifecycle.spec.ts` | **CRM archive** — create a client → search → Deactivate (status flips Active → Deactivated). |
| `tests/pdf.spec.ts` | **PDF generation** — asserts each PDF-owning screen exposes a generated-PDF artifact and that Regenerate is safe. |

## Extending toward exhaustive coverage

- **More screens:** add the route to `utils/routes.ts` — both the navigation and
  button sweeps pick it up automatically.
- **Item entry (CRUD):** add focused specs that fill a form and submit (the
  crawler deliberately *skips* submit/create/delete so it stays safe; targeted
  CRUD specs assert the create round-trip per module).
- **Per-persona access:** the `loginAs(page, persona)` fixture takes any of the 5
  seeded demo emails — duplicate the nav sweep per persona to assert role-gated screens.
- **Selectors:** prefer `getByRole` / `getByLabel` over CSS. The crawler is a
  safety net; per-flow specs are the precise coverage.

## Notes

- Demo accounts can't upload files or change credentials, so those paths are out
  of scope here.
- PDF generation needs the Python worker running; on a fresh demo DB a screen may
  have no PDF-able rows (reported as a skip, not a failure).
