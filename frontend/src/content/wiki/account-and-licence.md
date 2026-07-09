---
title: Account and licence
slug: account-and-licence
excerpt: One standard AORMS licence, storage metering, AI usage, company members, and account portals.
order: 5
section: Administration
updated: 2026-07-09
---

## One standard licence

AORMS has **no product tiers**. Every active account receives:

- The **full workspace** (projects, finance, HR, portals, AI, libraries)
- **Unlimited users**, clients, contractors, consultants, and projects
- **5 GB** included cloud storage

Legacy names (Lite, Pro, Core, Enterprise) are retired — licensing console and account screens show **AORMS Standard** only.

---

## What you pay for

| Meter | Included | Overage |
|-------|----------|---------|
| **Storage** | 5 GB | Per GB-month beyond included |
| **Hosted AI** | Usage-based | Per token/request when not using BYO key |
| **BYO AI key** | — | Your provider cost; AORMS does not meter hosted AI while BYO is active |

View usage in **Company → settings** (storage bar and AI studio settings).

---

## Account portals

| Portal | URL | Purpose |
|--------|-----|---------|
| **Personal account** | `/account` | Email, password, AORMS ID, credentials |
| **Company account** | `/company-account` | Members, company licence, administration |

Company **owners** invite members, approve joins, and manage the workspace licence key if your deployment uses node activation.

---

## Sign-in and security

- **Email** is canonical (lowercase) across the platform.
- Enable **TOTP** from the account security panel.
- **Portal users** (clients, contractors) use separate login flows at `/access`.

---

## Workspace profile gate

Existing users may be prompted once to complete **firm profile** fields (GSTIN, address, COA details) before accessing the workspace. This keeps proposals and invoices consistent.

---

## Storage management

1. Monitor usage in Company settings.
2. **Archive** closed projects to move files off hot storage where archive workflow exists.
3. Purchase additional storage through your account operator or hi@aorms.in.

---

## AI configuration

1. **Company account → Administration → AI Studio settings** (firm owner only).
2. AI Studio runs on a self-hosted Ollama model by default — no API keys needed. Optionally switch the provider to a firm-supplied **OpenAI-compatible** endpoint, model, and API key.
3. A PII-redaction toggle applies to stored AI output either way.

---

## Deleting a company workspace

- **Members** can leave via company account.
- **Owners** requesting full workspace deletion should contact [hi@aorms.in](mailto:hi@aorms.in).
- Platform operators can remove organisations from the licensing console (irreversible).

---

## Frequently asked questions

### Do I need a licence key for cloud SaaS?

Cloud accounts at aorms.in are **activated on sign-up**. Self-hosted or node installs may still display a key field — ignore for standard cloud unless support instructs otherwise.

### Can I add accountants without extra seats?

Yes. **Unlimited users** — add finance roles without per-seat fees.

### Where is the pricing page?

[aorms.in/#pricing](https://aorms.in/#pricing) — usage-based storage and AI on top of the included allowance.
