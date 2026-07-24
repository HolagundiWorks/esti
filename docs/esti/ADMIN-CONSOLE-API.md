# Licensing Console — HCW License Manager API (`admin.DOMAIN`)

The **HCW License Manager** is internalised in this monorepo (see
[HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md)). The console is a **UI
deployment** at `admin.DOMAIN` (e.g. `https://admin.aorms.in`) holding **no data
of its own** — every account, company, licence, and request lives in this
backend's `hlp_` tables, reached through the `/platform` API.

**Canonical ship path (this repo):** the frontend build emits a second entry,
`dist/admin.html` (the same Panel client as the embedded `/platform-admin`
fallback). `sudo bash deploy/install-admin-console.sh` serves it on an
`admin.DOMAIN` vhost that **proxies `/platform/` to the local backend** — every
call is same-origin, so none of the CORS notes below even come into play.

Optional: a third-party static client may implement this document's contract;
then the CORS + cookie mechanics in §1–2 apply. That is **not** a second
license-manager source tree.

## 1. Topology & configuration

```
Browser ── https://admin.aorms.in          (in-tree admin.html / install-admin-console.sh)
   │
   └─ fetch, credentials:"include" ──► https://aorms.in/platform/…   (this backend)
```

Required on **this** box (`/opt/esti/.env`, defaulted by the installer when the
licensing profile is selected):

```
VITE_ADMIN_URL=https://admin.aorms.in       # /platform-admin redirects here
ALLOWED_ORIGINS=https://aorms.in,https://admin.aorms.in
```

`ALLOWED_ORIGINS` powers both the CORS reflection (with
`access-control-allow-credentials: true` and preflight handling) and the CSRF
origin gate — every browser `POST` must carry an allow-listed `Origin` header.
`admin.DOMAIN → DOMAIN` is same-site, so the `hlp_session` cookie
(`HttpOnly; SameSite=Lax`, host-only on `DOMAIN`) is set and sent on
credentialed fetches without any cookie-domain tricks. The console must pass
`credentials: "include"` on **every** call.

## 2. Authentication

Cookie session, established by the console itself:

1. `POST /platform/auth/login` `{email, password, code?}` — `code` is the TOTP
   digits, required when the account has an authenticator
   (`401 {"error":"totp_required"}` → re-submit with `code`).
2. The response sets `hlp_session` — a browser-SESSION cookie (auto-logoff on
   browser exit; a 30-day server-side cap applies regardless). All subsequent calls
   ride it.
3. `GET /platform/auth/me` → `{account, activeOrg, memberships, pendingInvites,
   instantIdEligible, totpEnabled}`. `account.isPlatformAdmin` gates the
   console's admin surface. `account: null` = signed out.
4. `POST /platform/auth/logout` clears the session.

Console self-signup bootstrap: `POST /platform/auth/register`
`{email, password, name?}` is open only until the **first** platform admin
exists (then `403 registration_closed`); admin rights come from the
`PLATFORM_ADMIN_EMAILS` env list on this backend, never from the request.

## 3. Admin API — tRPC at `/platform/trpc`

All `admin.*` procedures require `account.isPlatformAdmin` (401 unauthenticated,
403 signed-in non-admin). Wire format is standard tRPC v11 (no transformer):
queries `GET /platform/trpc/<proc>?input=<url-encoded JSON>`, mutations
`POST /platform/trpc/<proc>` with the JSON input as the body. From TypeScript,
import the router type and use a tRPC client with
`httpBatchLink({ url: "https://aorms.in/platform/trpc", fetch: (u, o) => fetch(u, { ...o, credentials: "include" }) })`.

| Namespace | Procedures (input sketch) |
|---|---|
| `admin.accounts` | `list({search?})` · `resetPassword({email, newPassword})` |
| `admin.orgs` | `list()` · `create({name, slug?, …})` · `members({orgId})` · `inviteMember({orgId, email, role?})` — creates a claimable passwordless shell for new emails · `setMemberStatus({orgId, accountId, status: INVITED\|ACTIVE\|LEFT})` |
| `admin.products` | `list()` |
| `admin.licenses` | `list({orgId?, productId?})` · `create({orgId, productId, planId, …})` · `setStatus({licenseId, status: ACTIVE\|SUSPENDED\|REVOKED})` · `extend({licenseId, expiresAt: ISO\|null})` · `changePlan({licenseId, planId})` · `get({licenseId})` · `deactivateDevice({deviceRowId})` |
| `admin.apiKeys` | `list({productId?})` · `generate({productId, label, orgId?})` — plaintext key returned **once** · `revoke({id})` |
| `admin.certifications` | `list({accountPublicId})` · `issue({accountPublicId, title, …})` · `setStatus({id, status: ACTIVE\|REVOKED})` |
| `admin.requests` | `list()` · `pendingCount()` · `fulfil({requestId})` — issues + emails the licence key · `reject({requestId, note?})` |
| `admin.components` | `list()` · `publish({appVersion, …})` |

`auth.me` (tRPC) mirrors the REST `me` account.

## 4. Account/self-serve REST — `/platform/auth/*`

Session-authed unless noted. These power the customer portal at
`DOMAIN/account`, and the console may reuse any of them:

- Identity (Phase 34): `POST generate-id` (instant AORMS-U mint — invited
  accounts only; `403 not_eligible` otherwise) · `POST adopt-identity`
  `{company, email, password, code?}` — moves a pending invite onto the
  existing identity-holding account and re-writes the session as it.
- Companies: `POST create-company` `{name, loginDomain?}` — open to brand-new
  users; the org starts WITHOUT an AORMS-C handle (slug/login-domain serve as
  the handle) and earns it at 100 hours of company usage: owner-only
  `GET company-id-status?company=…` → `{publicId, minutes, requiredMinutes,
  eligible}` and `POST generate-company-id` `{company}` (idempotent;
  `400 not_eligible` before 100 h) · `POST join-company` ·
  `POST leave-company` · `POST switch-company` · `POST resolve-company` ·
  `POST invite-member` `{company, email, role?}` (company-owner authorization,
  not platform-admin) · `POST accept-invite` / `POST decline-invite`
  `{company}`.
- Plan/licence: `GET my-license` · `GET my-request` · `POST request-plan`
  `{plan: LITE|PRO}` · `GET my-credentials`.
- Security: `POST totp/setup` · `POST totp/enable` `{code}` ·
  `POST totp/disable` `{code}` · `GET verify-email?token=…` (public) ·
  `POST resend-verification`.
- Public: `GET registration-status` → `{adminExists}`.

Errors are `{error: "<code>"}` with 4xx status (`invalid_credentials`,
`totp_required`, `not_company_owner`, `not_eligible`, `not_invited`, …).

## 5. Machine API — `/v1/*` (Bearer product keys)

Server-to-server, authenticated with `Authorization: Bearer <product API key>`
(minted via `admin.apiKeys.generate`; never cookies, never CORS-dependent):
`POST activate` · `POST validate` · `POST refresh` · `GET entitlement` ·
`POST verify-login` · `POST verify-identity` · `POST generate-identity` ·
`POST sync-membership` · `POST manifest`. Product nodes (customer AORMS
installs) use these; the console only needs them if it adds server-side jobs.

## 6. Verified integration example

```js
// Sign in (from the admin.aorms.in origin):
await fetch("https://aorms.in/platform/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
// Admin query (tRPC):
const r = await fetch(
  "https://aorms.in/platform/trpc/admin.requests.pendingCount",
  { credentials: "include" },
);
```

The full chain — preflight (`access-control-allow-origin` reflected +
`allow-credentials: true`), credentialed login setting `hlp_session`,
session-riding `me` and tRPC calls, and the admin gate 403-ing non-admins —
is exercised in this repo's verification flow; the embedded console at
`/platform-admin` (kept as the dev/self-host fallback when `VITE_ADMIN_URL` is
unset) consumes exactly this API, so `frontend/src/platform-admin/` is a
working reference client for the standalone repo.
