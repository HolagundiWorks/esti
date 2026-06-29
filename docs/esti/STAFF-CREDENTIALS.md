# Staff Professional Credentials & COA Licence Expiry

**Status:** Specified — not yet implemented  
**Owner:** Holagundi Consulting Works (HCW)  
**Reviewed:** 2026-06-29

---

## Problem Statement

ESTI tracks the **firm's** COA registration number on the firm profile (`esti_firm.coa_reg_no`)
and on each named partner (`esti_partner.coa_reg_no`). Those numbers are stamped onto every
issued document (fee proposals, invoices, proposals, running bills, inspection reports, etc.)
via `firmPayload()` in `backend/src/lib/firm.ts`.

Three gaps exist today:

1. **No expiry date** — neither `esti_firm` nor `esti_partner` stores the COA registration
   expiry date, so the system cannot produce reminders before a firm or partner registration
   lapses.
2. **No per-staff credentials** — individual staff who are registered architects have their
   own COA registration numbers (separate from the firm's). These are currently stored only as
   unstructured file uploads (`esti_hr_document.document_type = 'COA_CERTIFICATE'`) with no
   registration number or expiry date field.
3. **No reminder mechanism** — there is no notification or Action Center alert for approaching
   or lapsed COA renewals at any level (firm, partner, staff).

An expired firm-level COA registration means the firm is legally not authorised to practise
architecture under the Architects Act 1972. Expired individual registrations affect what work
those staff can sign off. Both are time-critical and need proactive surfacing.

---

## Scope

This document specifies the **data model**, **reminder schedule**, and **UI surfaces** for
professional credential tracking. Implementation is deferred — this is a product specification.

Credential tracking covers:

| Record | Credential | Where tracked |
|---|---|---|
| Firm (SOLO architect) | COA Certificate of Registration + expiry | `esti_firm` (extend) |
| Partner (PARTNERSHIP firms) | COA Certificate of Registration + expiry | `esti_partner` (extend) |
| Individual staff member | COA registration, other professional credentials | new `esti_staff_credential` table |

---

## 1. Firm-Level COA Expiry (extend existing tables)

### 1a. `esti_firm` — add two fields

| Field | Type | Description |
|---|---|---|
| `coa_expiry` | `date` (nullable) | Expiry date of the firm's COA Certificate of Registration |
| `coa_class` | `text` (nullable) | COA registration class — `"CA"` (Corporate Architecture) or `"PA"` (Proprietary Architecture) or `"IA"` (Individual Architect) |

The existing `coa_reg_no` field (`text`, nullable, max 40) is the registration number and
stays unchanged.

### 1b. `esti_partner` — add one field

| Field | Type | Description |
|---|---|---|
| `coa_expiry` | `date` (nullable) | Expiry date of this partner's COA registration |

The existing `coa_reg_no` on `esti_partner` is already present.

### 1c. Firm profile form (Company page — `firm:admin`)

The Company page (`frontend/src/routes/Company.tsx`) should gain a **"COA Registration"**
section (below the firm identity block) where an Owner can enter:

- COA Registration No. *(existing field, already editable)*
- COA Registration Class (Select: Corporate / Proprietary / Individual)
- COA Expiry Date (DatePicker)

For a PARTNERSHIP firm, each partner row in the Partners table should gain an **Expiry date**
column alongside the existing `coaRegNo` input.

---

## 2. Staff Credentials Database (`esti_staff_credential`)

A new table stores **structured** professional credential records for individual staff members,
separate from the Document Vault (which holds file scans). The table supports multiple
credentials per person (COA, RERA, LEED, GRIHA, etc.).

### Table: `esti_staff_credential`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | Row identifier |
| `member_id` | `uuid` | FK → `esti_teammember.id` ON DELETE CASCADE | The staff member |
| `credential_type` | `text` | NOT NULL | See credential type codes below |
| `registration_no` | `text` | | Registration / licence number |
| `issuing_body` | `text` | | Issuing authority (e.g. "Council of Architecture India") |
| `registration_class` | `text` | | Registration class or grade (e.g. "IA", "LEED AP BD+C") |
| `issue_date` | `date` | | Date of issue / first registration |
| `expiry_date` | `date` | | Expiry / renewal due date (`null` = no expiry) |
| `is_active` | `boolean` | NOT NULL DEFAULT true | Whether the registration is currently valid |
| `document_id` | `uuid` | FK → `esti_hr_document.id` | Linked scanned certificate (optional) |
| `notes` | `text` | | Free-form notes (e.g. renewal status) |
| `verified_by` | `uuid` | FK → `esti_user.id` | Staff who verified the credential |
| `verified_at` | `timestamptz` | | Verification timestamp |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | |

### Credential type codes

| Code | Label | Issuing body | Has expiry? |
|---|---|---|---|
| `COA` | COA Registration | Council of Architecture India | Yes — annual renewal fee |
| `RERA_AGENT` | RERA Agent Registration | State RERA Authority | Yes — 5 years |
| `RERA_PROJECT` | RERA Project Registration | State RERA Authority | Yes — per project |
| `LEED_AP` | LEED Accredited Professional | USGBC / IGBC | Yes — 2 years (CEU) |
| `GRIHA` | GRIHA Evaluator | GRIHA Council | Yes |
| `IGBC_AP` | IGBC Accredited Professional | IGBC | Yes |
| `NABL` | NABL Accreditation | NABL (BIS) | Yes |
| `IE_MEMBER` | Institution of Engineers (India) | IEI | Yes — annual |
| `COA_FELLOW` | COA Fellow | Council of Architecture India | No |
| `OTHER` | Other professional credential | (free text in `issuing_body`) | Optional |

---

## 3. COA Expiry Reminder Schedule

Reminders fire for **each** expiring credential at the following intervals before
`expiry_date`. They use the existing `notifications` system (tRPC `notifications`
namespace, `esti_notification` table).

| Days before expiry | Severity | Recipient(s) | Channel |
|---|---|---|---|
| 90 days | Info | Owner (OWNER role) | In-app notification + Action Center tile |
| 30 days | Warning | Owner | In-app notification + Action Center tile |
| 14 days | Warning | Owner + the staff member | In-app notification |
| 7 days | Critical | Owner + the staff member | In-app notification + email |
| 0 days (expired today) | Critical | Owner + the staff member | In-app notification + email |
| Past expiry (daily, up to 30 days) | Critical | Owner | Daily in-app reminder until renewed |

**Firm / partner COA** reminders go to the Owner (OWNER role) only, since there is no
single staff member to notify.

**Staff credential** reminders go to both the Owner and the individual staff member
(if they have a login — matched via `esti_user.member_id`).

### Reminder generation

Reminders are generated by a scheduled job (Redis Streams, new job type
`credential_expiry_sweep`). The sweep:
1. Runs daily at 08:00 IST (06:30 UTC).
2. Queries `esti_staff_credential` and the new `coa_expiry` fields on `esti_firm` /
   `esti_partner` for any record with `expiry_date` within the trigger windows above.
3. Deduplicates: does not re-create a notification if one of the same `(credential_id,
   trigger_window)` already exists and was created in the last 23 hours.
4. Creates `esti_notification` rows tagged `category: "credential_expiry"` with a
   `metadata` payload:
   ```json
   {
     "credentialType": "COA",
     "registrationNo": "CA/1234/2025",
     "memberName": "Priya Sharma",
     "expiryDate": "2026-09-15",
     "daysRemaining": 30,
     "firmLevel": false
   }
   ```

---

## 4. Action Center Integration

The Dashboard Action Center (`dashboard.home` bundle, `frontend/src/routes/Dashboard.tsx`)
should surface credential expiry alerts as a dedicated action group alongside the existing
"Approvals pending", "Invoices overdue", etc. groups.

### Display rule

Show a credential expiry action card when **any** credential (firm, partner, or staff)
has `expiry_date` within 90 days or is past expiry.

| State | Card label | Tag |
|---|---|---|
| 90–31 days remaining | "COA renewal due — {name}" | `type="blue"` |
| 30–8 days remaining | "COA renewal soon — {name}" | `type="warm-gray"` → `type="orange"` (use closest Carbon type) |
| 7–1 days remaining | "COA expires in {N} days — {name}" | `type="red"` |
| Expired | "COA registration lapsed — {name}" | `type="red"` |

Each card links to the relevant record:
- Firm COA → Company page → COA Registration section
- Partner COA → Company page → Partners table row
- Staff COA → HR profile for that staff member → Credentials tab

---

## 5. Users Screen — Credential Status Column

The Users page (`frontend/src/routes/Users.tsx`) currently shows: Email · Name · Level ·
Role · Status · Actions.

A new **Credentials** column should be added, showing a compact credential status
indicator for each staff row:

| State | Indicator |
|---|---|
| All credentials current | `<Tag type="green">Current</Tag>` |
| Any credential expiring within 90 days | `<Tag type="blue">Renew soon</Tag>` |
| Any credential expiring within 30 days | `<Tag type="warm-gray">Renewing</Tag>` |
| Any credential expired | `<Tag type="red">Lapsed</Tag>` |
| No credentials on record | *(empty — no tag)* |

Clicking the tag or the staff row opens the HR profile for that member directly on the
Credentials tab.

### Credentials tab in HR profile

The existing HR profile modal / page (`frontend/src/routes/Hr.tsx`,
`frontend/src/components/hr/`) should gain a **Credentials** tab (alongside
Personal, Documents, etc.) showing:

- A Carbon `DataTable` listing each `esti_staff_credential` row:
  Type · Registration No. · Issuing Body · Class · Issue Date · Expiry Date · Status
- An "Add credential" action (Modal with the fields above)
- Each row has an "Edit" and a "Link document" action (to attach the scanned
  certificate from the Document Vault)
- Verified credentials show a checkmark + verifier name

Access: `hr:manage` capability to create/edit credentials; any office staff to view their
own.

---

## 6. Document Generation — COA Number on Issued Documents

The Python worker stamps the **firm's** COA registration number onto every generated
PDF via `firmPayload()`. This path does not need changing.

For documents that carry an individual architect's COA number (e.g. the architect of
record on a statutory drawing, or a design certification letter), the document payload
should accept an optional `architectCoaRegNo` field derived from the signing staff
member's `esti_staff_credential` where `credential_type = 'COA'`.

The PDF worker templates (`worker/esti_worker/jobs/pdf.py`) for the following renderers
should accept and display `architectCoaRegNo` when present:

| Renderer | Where COA number appears |
|---|---|
| `feeproposal` | Signatory block — "Ar. Name, COA Reg. No. CA/XXXX" |
| `proposal` | Cover block |
| `inspection` | Inspector's signature block |
| `progress_report` | Author block |
| `drawing` | Title block (when applicable) |

If an individual staff member's COA credential is **expired** at the time of document
generation, the backend should add a warning flag to the job payload:
`coaExpired: true`. The PDF template renders a visible caution line:

> ⚠ COA registration expired — verify renewal before issuing.

---

## 7. Gaps in the Current Implementation (summary)

| Gap | Location | Priority |
|---|---|---|
| `coa_expiry` missing on `esti_firm` | `backend/src/db/schema/org-auth.ts` | P0 |
| `coa_expiry` missing on `esti_partner` | `backend/src/db/schema/org-auth.ts` | P0 |
| No structured staff credential table | New `esti_staff_credential` table needed | P0 |
| COA number missing from `esti_hr_profile` / `esti_teammember` for individual staff | `esti_staff_credential` table (above) covers this | P0 (via new table) |
| No reminder / notification job for credential expiry | New worker job type `credential_expiry_sweep` | P1 |
| No credential status in Users screen | `Users.tsx` — new Credentials column | P1 |
| No Credentials tab in HR profile | `Hr.tsx` + `components/hr/` | P1 |
| No Action Center cards for credential expiry | `Dashboard.tsx` + `dashboard.home` bundle | P1 |
| No per-staff COA number on generated documents | `pdf.py` templates + `firmPayload` extension | P2 |
| COA expiry warning on generated documents | `pdf.py` templates | P2 |

---

## 8. Related Files (no implementation yet)

| Layer | File | What changes |
|---|---|---|
| DB schema | `backend/src/db/schema/org-auth.ts` | Add `coa_expiry`, `coa_class` to `firm`; `coa_expiry` to `partners` |
| DB schema | `backend/src/db/schema/hr-work.ts` | New `staffCredentials` table |
| Migration | `backend/drizzle/XXXX_staff_credentials.sql` | CREATE TABLE + ALTER TABLE for firm/partner expiry |
| Contracts | `packages/contracts/src/staff-credential.ts` | New file — `CredentialType` enum, `StaffCredential` zod schema |
| Contracts | `packages/contracts/src/firm.ts` | Add `coaExpiry?: string`, `coaClass?: string` to `FirmUpdate` and `PartnerInput` |
| Backend router | `backend/src/modules/users/credentialRouter.ts` | New tRPC namespace `credentials` |
| Root router | `backend/src/trpc/router.ts` | Mount `credentials` namespace |
| Worker job | `worker/esti_worker/jobs/credential_sweep.py` | New job handler |
| Worker router | `worker/esti_worker/router.py` | Register `credential_expiry_sweep` |
| Frontend | `frontend/src/routes/Hr.tsx` | Credentials tab |
| Frontend | `frontend/src/components/hr/CredentialsTab.tsx` | New component |
| Frontend | `frontend/src/routes/Users.tsx` | Credentials column |
| Frontend | `frontend/src/routes/Dashboard.tsx` | Action Center credential cards |
| Frontend | `frontend/src/routes/Company.tsx` | COA expiry field in firm form |

---

## 9. Legal Reference

| Requirement | Basis |
|---|---|
| COA registration mandatory for practising architects | Architects Act 1972, §25 — unlawful to use the title "Architect" without registration |
| Annual renewal fee to COA | COA Regulations — registration lapses if the annual fee is not paid |
| Registration class | COA issues individual and corporate certificates; number format `CA/NNNN/YYYY` or `IA/NNNN/YYYY` |
| RERA registration for projects > 500 m² | Real Estate (Regulation and Development) Act 2016 — architects certifying RERA disclosures must be registered |
