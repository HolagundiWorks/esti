# AORMS Identity — account model & login

> **Status:** **I-1…I-5 shipped** (IDs · tenant-first login · sign-up/activation · portable
> certs/growth · firm-user projection). Remaining runtime work: point the firm app / desktop
> at the live platform as the identity authority, and the hybrid desktop offline-cache
> (needs the deployed platform base URL + a desktop change) — tracked as follow-ups below.
> Delivery: phased to `main`, each phase additive so existing logins keep working.
> Desktop target is hybrid: online identity, locally-cached session for offline open.
> Supersedes the ad-hoc split between
> the licensing-platform accounts (`hlp_*`) and the firm-app users (`esti_user`).
> Related: [`ACCESS-HIERARCHY.md`](ACCESS-HIERARCHY.md), the licensing platform
> (`backend/src/licensing-platform/`), LXOS (learning/certification pillar).

## 1. The idea

A person's professional identity is **theirs**, not the firm's. AORMS models three
**distinct, non-overlapping** account types and a **portable personal identity** whose
unique ID carries certifications + growth across companies — change firms, keep the ID
and the track record.

| Account type | Who | Where they act | Unique ID |
|---|---|---|---|
| **Platform admin** | Holagundi/AORMS team only | `/platform-admin` (products, plans, licences) | — (internal) |
| **Company** | a firm | owns the company workspace, holds the licence | `AORMS-C-XXXX` |
| **Personal** | an individual professional | activates into a company; owns their certs/growth | `AORMS-U-XXXX` |

The **personal** identity is the pivot: it exists independently of any company, and is
*activated* into a company (membership). Its certs/growth live on the **person**, so they
survive moving between firms.

## 2. Login — tenant-first, two steps

Login is **company first, then user**. The company you name selects the tenant (or the
admin console); the user step authenticates the person within it.

```
┌─ Step 1: Company ──────────────┐
│  "Company email or domain"      │
│  e.g.  acme.in / contact@acme.in│
│         or AORMS-C-2K4P          │
└──────────────┬──────────────────┘
               │ resolve
     ┌─────────┴──────────┐
     │                    │
 domain = aorms.in?   a customer company?
     │ yes                │ yes
     ▼                    ▼
┌─ Step 2a: ADMIN ─┐  ┌─ Step 2b: USER ───────────┐
│ platform-admin   │  │ "Your email + password"    │
│ email + password │  │ authenticate personal acct │
│ → /platform-admin│  │ verify membership of company│
└──────────────────┘  │ → company workspace         │
                       └────────────────────────────┘
```

Rules:
1. **Screen 1 asks only for the company** (email or domain, or the `AORMS-C-` id).
2. **Screen 2 asks for the user login** (email + password).
3. **Same email for both is fine** — a solo practitioner enters `john@studio.in` as the
   company in Step 1, then again as the user in Step 2. Same flow, no special case.
4. **If the company resolves to AORMS itself** (domain `aorms.in` / the platform-owner
   org), Step 2 becomes the **platform-admin** login (the Holagundi team). Otherwise it's
   the ordinary user login for that company.
5. Unresolved company → "Company not found" + offer **Create a company** (the company
   sign-up flow), which then lets the owner create/activate their personal account into it.

### Resolution logic (backend)
```
resolveCompany(input):                       # input = email | domain | AORMS-C-id
  domain = input.includes('@') ? domainOf(input) : input   # normalize
  if domain in PLATFORM_ADMIN_DOMAINS (aorms.in):
     return { mode: 'admin' }
  org = orgs.findByDomain(domain) ?? orgs.findByPublicId(input)
  return org ? { mode: 'company', org } : { mode: 'not_found' }

loginUser(org, email, password):
  account = accounts.byEmail(email); verifyPassword()
  if not membership(account, org): reject "not a member of {company}"
  issue session scoped to (accountId, orgId)  # the active company
```

## 3. Unique identifiers

- **Company:** `AORMS-C-` + short base32 (e.g. `AORMS-C-2K4P`). Stable, human-quotable.
- **User:** `AORMS-U-` + short base32 (e.g. `AORMS-U-9F3T`). **This is the portable ID** —
  it never changes, and every certification / growth record is keyed to it.
- Generated once at creation, stored on the row, shown in the UI (Profile / Company).
- The opaque internal ids (`acc_…`, `org_…`) stay as PKs; the `AORMS-U/C-` ids are the
  human-facing handles + the join key for portable records.

## 4. Certifications + growth (portable)

Keyed to the **user ID**, never the company:

| Record | Keyed by | Notes |
|---|---|---|
| Certifications (issued/earned) | `AORMS-U-id` | title, issuer, date, evidence; visible across companies |
| Growth / ASPRF history | `AORMS-U-id` | performance + learning signal accrues to the person |
| Company memberships (history) | `AORMS-U-id` × `AORMS-C-id` | which firms, when, role — a career timeline |

This is the **LXOS pillar** made concrete + the nav's stubbed "AORMS Identity / Cert /
Index". When a person moves firms, the new company sees their verified certs (read) but
the records stay owned by the person.

## 5. Data model (proposed)

Extend the licensing platform (already the cross-company home of accounts + orgs), so
portability comes for free.

```
hlp_account   += public_id   text unique   -- AORMS-U-XXXX
hlp_organization += public_id text unique  -- AORMS-C-XXXX
              += login_domain text unique   -- e.g. acme.in (nullable; for Step-1 resolution)
              += login_email  text          -- optional alternate Step-1 handle

-- activation = membership (already exists as hlp_org_member: orgId, accountId, role)
--   add:  status ('INVITED'|'ACTIVE'|'LEFT'),  activated_at,  left_at

-- portable records (new; keyed to hlp_account.public_id):
hlp_certification (id, account_public_id, title, issuer, issued_at, evidence_key, status)
hlp_growth_event  (id, account_public_id, kind, value jsonb, org_public_id?, at)
```

- The **firm-app user** (`esti_user`, per-firm) becomes a *projection* of the membership:
  activating a person into a company creates/links an `esti_user` carrying `account_public_id`,
  so the firm sees a team member while the certs live centrally.
- `PLATFORM_ADMIN_DOMAINS` (env, default `aorms.in`) drives the admin branch in Step 1.

## 6. Activation / portability flows

- **Company sign-up:** create `hlp_organization` (+ `AORMS-C-id`, `login_domain`), owner
  account, `hlp_org_member(OWNER, ACTIVE)`, licence.
- **Personal sign-up + activate:** create `hlp_account` (+ `AORMS-U-id`), then join a
  company (by domain/invite) → `hlp_org_member(status ACTIVE)` + linked `esti_user`.
- **Leave a company:** `hlp_org_member.status = LEFT` (+ `left_at`); the `esti_user` is
  deactivated. Certs/growth untouched (they're on the person).
- **Re-activate elsewhere:** the **same** `AORMS-U-id` joins another company → new
  membership; the growth timeline shows both firms.

## 7. Mapping to what exists (migration)

| Concept | Today | Change |
|---|---|---|
| Platform admin | `hlp_account.isPlatformAdmin` | keep; Step-1 admin branch on `aorms.in` |
| Company | `hlp_organization` | + `public_id`, `login_domain` |
| Personal | `hlp_account` | + `public_id` |
| Activation | `hlp_org_member` | + `status`, timestamps |
| Firm user | `esti_user` | link `account_public_id`; created on activation |
| Login | firm-cookie **or** platform email+password | unified tenant-first two-step |

Migration is additive (new columns/tables + a backfill of `public_id`s); existing firm
logins keep working during the transition (the two-step UI wraps the existing auth).

## 8. Open decisions (confirm before build)

1. **Company Step-1 handle** — domain (`acme.in`), a company email, or the `AORMS-C-id`?
   (Proposed: accept **any** of the three; domain is primary.)
2. **One personal account, many companies simultaneously** (moonlighting) vs. one active
   company at a time? (Proposed: many memberships, **one "active company"** per session;
   a company switcher.)
3. **Cert issuance** — who can issue certs (AORMS only? companies? LXOS courses?).
4. **`esti_user` vs `hlp_account`** — fully unify (one identity table) later, or keep the
   projection (simpler migration)? (Proposed: projection now, unify later.)

## 9. Phased plan

| Phase | Scope |
|---|---|
| **I-1 — IDs** ✅ | `public_id` on `hlp_account`/`hlp_organization` (`AORMS-U/C-`), generator (`newPublicId`, Crockford base32), backfill (migration 0132), surfaced in the platform-admin console (account chip + Organizations table). *Profile/Company display arrives with the I-5 firm-user projection.* |
| **I-2 — Tenant-first login** ✅ | Step-1 company resolver (`resolveCompany`: `AORMS-C-` handle / company login-domain / slug, `aorms.in`+admin-email → admin branch) at `POST /platform/auth/resolve-company`; Step-2 `POST /platform/auth/login` takes an optional `company` and, for a customer tenant, requires a verified `hlp_org_member` membership; the `hlp_session` cookie is scoped to `(account, org)`; `/switch-company` + a Panel company switcher for the active tenant. Migration 0133 adds `login_domain`/`login_email`; org create sets the login domain. **Additive** — omitting `company` keeps the legacy single-step platform-admin login. |
| **I-3 — Company + personal sign-up** ✅ | Membership activation lifecycle on `hlp_org_member` (`status` INVITED→ACTIVE→LEFT + `activated_at`/`left_at`, migration 0134). Self-serve: `POST /platform/auth/{create,join,leave}-company` — joining auto-ACTIVEs when the account's email domain matches the company login-domain, else INVITED pending approval. Admin: `orgs.members` / `inviteMember` / `setMemberStatus`. Only ACTIVE memberships sign in / switch (enforced in the resolver). UI: a "Your companies" panel (create/join/leave) + a Members manager in the Orgs tab. |
| **I-4 — Portable certs/growth** ✅ | `hlp_certification` + `hlp_growth_event` keyed to `account_public_id` (AORMS-U), migration 0135. `modules/portable/service.ts`: issue/list/revoke certs, record/list growth (the ASPRF/LXOS seam). Self view at `GET /platform/auth/my-credentials` + a "My credentials" tile; admin issuance via `admin.certifications.*` + an Issue-cert form in the Members manager. *Deep ASPRF/LXOS wiring rides on I-5's firm-user link (recordGrowth is the ready seam).* |
| **I-5 — Firm-user projection** ✅ | `esti_user.account_public_id` (migration 0136) links a firm login to a central person (AORMS-U). Owner links/unlinks via `users.linkIdentity` (validates the handle exists on the platform, same DB); the handle shows in the Users table and the firm Profile › AORMS Identity tab, and rides on `users.list`/`myProfile`. Additive — existing firm logins are simply unlinked until an owner links them. |

Each phase: contracts → migration → backend → Pure-Carbon UI → verify → commit.

## 10. Remaining runtime work (post-I-5)

The identity **model** is complete and on `main`. What's left is wiring live behaviour,
which needs a deployed platform + a couple of product decisions:

- **Identity authority URL** — ✅ *wired.* Firm installs default `ESTI_LICENSE_API_URL` to
  `https://aorms.in/platform` (deploy template + `.env.example`), so a node activates /
  refreshes its **licence** against the central platform (`/platform/v1`). Tenant-first
  Step-1 already routes `aorms.in` → platform-admin (`PLATFORM_ADMIN_DOMAINS` default).
  *Still local:* firm **credential** verification (`esti_user` password) is not yet
  delegated to the platform — that's the login-path change below.
- **Delegate firm login to the platform** — ✅ *shipped (opt-in, default off).* With
  `ESTI_IDENTITY_DELEGATE=true`, `auth.login` verifies against the platform's machine
  endpoint `POST /platform/v1/verify-login` (Bearer `ESTI_PRODUCT_API_KEY`, enforcing
  `ESTI_COMPANY` membership), then projects the verified person onto a local `esti_user`
  (`provisionLocalUser` — links by AORMS-U/email, new users land as ASSOCIATE, never
  auto-OWNER). **Hybrid offline grace:** if the platform is unreachable the last
  successful password is cached locally and login falls back to it, so the app still
  opens offline. Default off = unchanged local login. *To enable: mint a product API key
  at `/platform-admin`, set the three env vars, pilot on one install before flipping it
  on widely.*
- **Hybrid desktop offline cache** — cache the last successful online login so the desktop
  opens offline after first sign-in (a `desktop/src-tauri` change). Chosen model: online
  identity, locally-cached session.
- **ASPRF → growth** — call `recordGrowth(accountPublicId, …)` from the firm ASPRF/LXOS
  pipelines so performance + learning accrue to the linked person. The seam exists
  (`modules/portable/service.ts`); wiring it touches ASPRF hot paths, deferred deliberately.
