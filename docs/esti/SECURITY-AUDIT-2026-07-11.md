# Security audit — AORMS application & public surfaces

**Audit date:** 2026-07-11 · **Scope:** Backend API, tRPC, licensing platform, file storage, frontend SPA (authenticated + public marketing), deploy/nginx. **Method:** Code review + remediation pass.

**Companion:** [PUBLIC-PAGES-AUDIT-2026-07-11.md](../marketing/PUBLIC-PAGES-AUDIT-2026-07-11.md) · [11-audits/README.md](../hcw-kit/11-audits/README.md)

---

## Executive summary

| Severity | Found | Fixed | Remaining |
| --- | --- | --- | --- |
| **Critical** | 0 | — | — |
| **High** | 4 | 4 | 0 |
| **Medium** | 14 | 14 | 0 |
| **Low** | 12+ | 10 | 2 accepted |

**Status (2026-07-11):** All phased remediation complete. Residual accepted risks: CSRF double-submit (S21), public `/health` metadata (S18).

---

## Issue tracker

Status: `open` · `done` · `accepted` · `deferred`

| ID | Sev | Status | Area | Finding | Fix |
| --- | --- | --- | --- | --- | --- |
| **S1** | High | done | `GET /files/*` | File download IDOR | `storageAccess.ts` — DB-scoped ACL per role |
| **S2** | High | done | `/platform/auth/login` | No rate limit | 10/min IP, 10/5min email |
| **S3** | High | done | `/api/license/activate` | Unauthenticated activation | Rate limits (20/5min IP, 10/hr key) |
| **S4** | High | done | `DEV_LOGIN=1` | Passwordless platform login | `assertPlatformProductionEnv()` |
| **S5** | Medium | done | Public markdown | XSS via `marked` | DOMPurify on wiki/blog/SEO |
| **S6** | Medium | done | CSP | Missing | nginx CSP + Permissions-Policy |
| **S7** | Medium | done | Sessions | Reset doesn't revoke | `revokeAllSessionsForUser` on reset |
| **S8** | Medium | done | Sessions | Stale sessions on login | Revoke all sessions before new login |
| **S9** | Medium | done | `auth.resolveEmail` | Email enumeration | Always return local workspace when install has users |
| **S10** | Medium | done | Platform cookie | `sameSite: lax` | `hlp_session` → `strict` (OAuth state cookies stay `lax`) |
| **S11** | Medium | done | Demo blog | Credentials in public markdown | Removed literal password from blog post |
| **S12** | Medium | done | `DEMO_MASTER_PASSWORD` | Default in prod | `assertProductionSecrets` |
| **S13** | Medium | done | Desktop | Bearer in `localStorage` | Tauri secrets dir + migrate legacy |
| **S14** | Medium | done | Uploads (FE) | Raw `fetch` | `authorizedFetch` everywhere |
| **S15** | Medium | done | Platform env | No Zod validation | Zod schema + prod asserts |
| **S16** | Medium | done | SVG viewer | `innerHTML` from server SVG | DOMPurify SVG profile |
| **S17** | Low | done | `/readyz` | Public dependency probe | nginx localhost-only + backend loopback gate |
| **S18** | Low | accepted | `/health` | Public release metadata | Acceptable — no secrets in payload |
| **S19** | Low | done | Calendar ICS | Secret URL, no TTL | 90-day token expiry + rotate API |
| **S20** | Low | done | `auth.bootstrap/register` | First-user on empty DB | Blocked in production (non-desktop) |
| **S21** | Low | accepted | CSRF | Origin-only gate | Acceptable with strict SameSite + CORS |
| **S22–S28** | Low | done | Various | See prior audit | — |
| **S29** | Low | done | Permissions-Policy | Missing | nginx header |
| **S30** | Low | done | Dependency CVEs | No CI scan | `pnpm audit --audit-level=high` in CI |

---

## Remediation phases (complete)

### Phase 1 — High
File ACL · platform/license rate limits · prod env asserts (`DEV_LOGIN`, `DEMO_MASTER_PASSWORD`)

### Phase 2 — Medium
DOMPurify · CSP · session revoke (reset + login) · upload `authorizedFetch`

### Phase 3 — Hardening
Desktop secure token storage · resolveEmail anti-enumeration · platform env Zod · SVG sanitize · `/readyz` restrict · calendar token TTL · bootstrap/register prod lock · CI audit

---

## Public pages security checklist

| Check | Pass? |
| --- | --- |
| HTTPS in production | ✅ |
| Auth cookies httpOnly | ✅ (web) |
| No secrets in static HTML/JS | ✅ |
| Markdown XSS sanitized | ✅ |
| SVG XSS sanitized | ✅ |
| CSP | ✅ (nginx) |
| Demo creds not in marketing content | ✅ |
| `/readyz` not public | ✅ (localhost + loopback) |

---

## Fix log

| Date | IDs | Notes |
| --- | --- | --- |
| 2026-07-11 | S8–S20,S30,S11,S13,S15,S16 | Phase 3 complete |
| 2026-07-11 | S1,S2,S3,S4,S5,S6,S7,S12,S14,S29 | Phase 1+2 |
| 2026-07-11 | — | Initial code-review audit |

---

## Related docs

- [ADMIN-GUIDE.md](ADMIN-GUIDE.md)
- [PRODUCTION-OPS.md](PRODUCTION-OPS.md)
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)
