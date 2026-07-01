# AORMS Identity — account model & login

> **Status:** design (proposed). Owner: Holagundi. Supersedes the ad-hoc split between
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
| **I-1 — IDs** | `public_id` on `hlp_account`/`hlp_organization` (`AORMS-U/C-`), generator, backfill, show in Profile/Company. |
| **I-2 — Tenant-first login** | Step-1 company resolver (domain/email/id) + `aorms.in`→admin branch; Step-2 user login with membership check; session scoped to (account, org). Wraps existing auth. |
| **I-3 — Company + personal sign-up** | Company create (domain + owner); personal create + **activate into company** (`hlp_org_member` status); leave/re-activate. |
| **I-4 — Portable certs/growth** | `hlp_certification` + `hlp_growth_event` keyed to `AORMS-U-id`; Profile shows them across companies; wire ASPRF/LXOS. |
| **I-5 — Firm-user projection** | `esti_user.account_public_id`; activation creates/links the firm user; company switcher. |

Each phase: contracts → migration → backend → Pure-Carbon UI → verify → commit.
