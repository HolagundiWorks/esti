# HR Profile & Staff Registry System

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-21

Full lifecycle management for internal staff: job applications → onboarding → active employee record → document vault → exit. For access levels see [ACCESS-MODEL.md](ACCESS-MODEL.md).

---

## Overview

ESTI maintains four separate but linked records for each staff member:

| Record | Table | Purpose |
|---|---|---|
| **Team member** | `esti_teammember` | Operational: name, job role, salary, assignments |
| **User login** | `esti_user` | Auth: email, password hash, access level role |
| **HR profile** | `esti_hr_profile` | Personal details: DOB, IDs, address, bank, emergency contacts |
| **Document vault** | `esti_hr_document` | Scanned documents: Aadhaar, PAN, certificates, etc. |

A **job application** (`esti_job_application`) is the entry point. On hire, it is converted to a team member record and linked.

---

## Staff Level Tier (display-facing: L1 – L4)

This is the four-grade **display tier** shown on staff cards, ID cards, and the HR interface. It maps to the internal API access model (L1–L5 in `permissions.ts`) as follows:

| Display | Label | Maps to API role | API Rank | Card colour |
|---|---|---|---|---|
| **L1** | Principal | `OWNER` | 100 | Red `#da1e28` |
| **L2** | Senior | `PARTNER` · `SENIOR` | 80 / 60 | Purple `#6929c4` |
| **L3** | Professional | `ASSOCIATE` | 40 | Blue `#0f62fe` |
| **L4** | Support / Junior | `VIEWER` | 20 | Green `#198038` |

The `staffLevel` column on `esti_teammember` stores L1–L4 and is set manually for each staff member. Team members without a login (operational staff only) also carry this level for card display.

**Third-party external tier** (not on the L1–L4 ladder):

| Tier | Class | Identity | Card colour |
|---|---|---|---|
| **T1** | Client | `esti_user.clientId` set | Teal `#005d5d` |
| **T2** | Consultant | `esti_user.consultantId` set | Amber `#b45309` |
| **T3** | Contractor | Tender token (no user row) | Gray `#525252` |

---

## Internal Staff Roles (job categories)

`esti_teammember.role` is the job category code. `jobTitle` (free text) carries the specific designation shown on the ID card.

| Code | Label | Typical level |
|---|---|---|
| `PRINCIPAL_ARCHITECT` | Principal Architect | L1 |
| `ASSOCIATE_PARTNER` | Associate Partner | L2 |
| `SENIOR_ARCHITECT` | Senior Architect | L2 |
| `PROJECT_MANAGER` | Project Manager | L2–L3 |
| `ARCHITECT` | Architect | L3 |
| `SITE_SUPERVISOR` | Site Supervisor | L3 |
| `ENGINEER` | Engineer | L3 |
| `INTERN` | Intern / Trainee | L4 |
| `ADMIN` | Admin / Support | L4 |
| `ACCOUNTS` | Accounts / Finance | L3–L4 |

Existing codes (`PROJECT_LEAD`, `ARCHITECT`, `INTERN`, `SITE_SUPERVISOR`, `ADMIN`, `ACCOUNTS`) remain valid. New codes added in contracts.

---

## HR Profile — personal details

Fields stored in `esti_hr_profile` (one-to-one with `esti_teammember`):

### Personal
- Date of birth
- Gender (MALE / FEMALE / OTHER / PREFER_NOT_TO_SAY)
- Blood group
- Nationality (default: Indian)

### Government-issued identity (India)
- **Aadhaar number** — 12-digit UID (mandatory for Indian nationals; required by law for employment)
- **PAN number** — 10-char alphanumeric (mandatory for payroll, TDS, Form 16)
- **Passport number** + expiry + issuing country
- Voter ID (optional)
- Driving licence (optional)

### Address
- Permanent address (line1, line2, city, state, pincode, country)
- Current/correspondence address (or "same as permanent")

### Communication
- Personal email (separate from work email)
- Personal mobile
- Emergency contact: name, relation, phone

### Payroll / financial
- Bank account number + IFSC + bank name + branch
- PF UAN (Universal Account Number — mandatory for PF deduction)
- ESIC number (for ESI benefit eligibility)

---

## Document Vault

`esti_hr_document` stores one row per document upload. S3 key points to the actual file.

### Document types

| Code | Label | Legal basis |
|---|---|---|
| `AADHAAR` | Aadhaar card | ID + address proof (UIDAI) |
| `PAN` | PAN card | Tax identity (Income Tax Act) |
| `PASSPORT` | Passport | ID + nationality |
| `VOTER_ID` | Voter ID card | Address proof |
| `DRIVING_LICENCE` | Driving licence | ID + address |
| `PHOTO` | Passport-size photo | HR record |
| `DEGREE` | Degree certificate | Educational qualification |
| `MARKSHEET` | Marksheet / transcript | Academic record |
| `COA_CERTIFICATE` | COA registration | Council of Architecture India (mandatory for Architects) |
| `PROFESSIONAL_CERT` | Professional certificate | PG Diploma, short courses |
| `OFFER_LETTER` | Offer letter | Employment record |
| `APPOINTMENT_LETTER` | Appointment / joining letter | Employment record |
| `JOINING_FORM` | Joining declaration form | Statutory (PF, ESIC nomination) |
| `EXPERIENCE_LETTER` | Experience letter (previous) | Background verification |
| `RELIEVING_LETTER` | Relieving letter (previous) | Background verification |
| `NOC` | No-objection certificate | From previous employer if required |
| `SALARY_SLIP_PREV` | Previous salary slip | Background / payroll |
| `FORM_16` | Form 16 (TDS) | Tax filing |
| `PF_STATEMENT` | PF statement | PF record |
| `BANK_PROOF` | Cancelled cheque / passbook | Payroll bank setup |
| `POLICE_CLEARANCE` | Police clearance | Background check |
| `OTHER` | Other | Miscellaneous |

Documents can be marked **verified** by an L4/L5 staff member.

---

## Application → Onboarding Pipeline

`esti_job_application` tracks candidates from initial expression of interest through to onboarding.

### Statuses

```
APPLIED → SCREENING → INTERVIEW → OFFER → ONBOARDED
                                        ↘ REJECTED
                   ↘ REJECTED            ↘ WITHDRAWN
         ↘ REJECTED
```

| Status | Meaning |
|---|---|
| `APPLIED` | CV received, not yet reviewed |
| `SCREENING` | Under initial HR screening |
| `INTERVIEW` | Interview round(s) in progress |
| `OFFER` | Offer extended, awaiting acceptance |
| `ONBOARDED` | Joined; linked to `esti_teammember` row |
| `REJECTED` | Not proceeding |
| `WITHDRAWN` | Candidate withdrew |

### Onboarding action

When status = ONBOARDED, the staff creates a `esti_teammember` row and links it via `member_id`. The application is then archived.

---

## Access control

| Action | Min level |
|---|---|
| View own HR profile | L1 (any staff) |
| View others' HR profiles | L4 (`hr:manage`) |
| Edit HR profiles | L4 (`hr:manage`) |
| Upload / verify documents | L4 (`hr:manage`) |
| Create / manage job applications | L4 (`hr:manage`) |
| Onboard applicant to team | L4 (`hr:manage`) |

---

## Implementation files

| Layer | File |
|---|---|
| Schema | `backend/src/db/schema/hr-work.ts` — `hrProfiles`, `hrDocuments`, `jobApplications` tables |
| Migration | `backend/drizzle/0071_hr_profile_system.sql` |
| Contracts | `packages/contracts/src/hr-profile.ts` |
| Backend router | `backend/src/modules/team/hrProfile.ts` |
| Upload route | `backend/src/modules/users/photoUpload.ts` (extended for HR docs) |
| Frontend tab | `frontend/src/routes/Hr.tsx` — "Profiles" + "Applications" tabs |
| Components | `frontend/src/components/hr/` |

---

## Indian law reference

| Requirement | Basis |
|---|---|
| Collect Aadhaar for ID | Voluntary (Supreme Court judgement 2018 — cannot mandate for private employment; collect as voluntary with consent) |
| Collect PAN for TDS | Section 206AA, Income Tax Act — deduct TDS at 20% if PAN not provided |
| PF deduction | Employees' Provident Funds Act 1952 — mandatory for firms with 20+ employees; voluntary below |
| ESIC | Employees' State Insurance Act 1948 — mandatory for employees earning ≤ ₹21,000/month |
| COA registration | Architects Act 1972 — practising architects must be registered with Council of Architecture India |
| Form 16 | Income Tax Act — employer must issue TDS certificate annually |
