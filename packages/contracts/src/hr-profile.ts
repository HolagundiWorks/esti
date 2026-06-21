import { z } from "zod";

// ── Staff level display tier ────────────────────────────────────────────────

export const STAFF_LEVELS = ["L1", "L2", "L3", "L4"] as const;
export type StaffLevel = (typeof STAFF_LEVELS)[number];

export const STAFF_LEVEL_LABEL: Record<StaffLevel, string> = {
  L1: "L1 — Executive",
  L2: "L2 — Management",
  L3: "L3 — Technical",
  L4: "L4 — Execution",
};

/** Expanded description per level (users, scope) aligned with hierarchy document. */
export const STAFF_LEVEL_DESCRIPTION: Record<StaffLevel, string> = {
  L1: "Owners, Directors, Stakeholders — full company access, no restrictions",
  L2: "Partners, Finance Managers, HR Leads — department financial & HR operations",
  L3: "Architects, Engineers, Project Managers, Senior Supervisors — assigned project + limited financial visibility",
  L4: "Interns, Junior Engineers, Junior Architects, Site Supervisors — assigned tasks only",
};

/** Card/avatar colour for each display level (Carbon palette values). */
export const STAFF_LEVEL_COLOR: Record<string, string> = {
  L1: "#da1e28", // Carbon Red 60      — L1 Executive (Owner/Director)
  L2: "#6929c4", // Carbon Purple 70   — L2 Management (Partner/Finance/HR)
  L3: "#0f62fe", // Carbon Blue 60     — L3 Technical (Senior, Associate, Architect, Engineer)
  L4: "#198038", // Carbon Green 60    — L4 Execution (Intern, Junior, Site Supervisor)
  T1: "#005d5d", // Carbon Teal 70     — T1 Client portal
  T2: "#b45309", // Amber              — T2 Consultant collaborator
  T3: "#525252", // Carbon Gray 70     — T3 Contractor / Bidder
};

/**
 * Map auth role → document display level (L1 = highest per hierarchy doc).
 *   L1 Executive  = OWNER
 *   L2 Management = PARTNER
 *   L3 Technical  = SENIOR, ASSOCIATE
 *   L4 Execution  = VIEWER
 */
export const ROLE_TO_DISPLAY_LEVEL: Record<string, string> = {
  OWNER: "L1",
  PARTNER: "L2",
  SENIOR: "L3",
  ASSOCIATE: "L3",
  VIEWER: "L4",
  CLIENT: "T1",
  CONSULTANT: "T2",
};

// ── HR document types ───────────────────────────────────────────────────────

export const HR_DOCUMENT_TYPES = {
  AADHAAR: "Aadhaar card",
  PAN: "PAN card",
  PASSPORT: "Passport",
  VOTER_ID: "Voter ID",
  DRIVING_LICENCE: "Driving licence",
  PHOTO: "Passport-size photo",
  DEGREE: "Degree certificate",
  MARKSHEET: "Marksheet / transcript",
  COA_CERTIFICATE: "COA registration certificate",
  PROFESSIONAL_CERT: "Professional certificate",
  OFFER_LETTER: "Offer letter",
  APPOINTMENT_LETTER: "Appointment / joining letter",
  JOINING_FORM: "Joining declaration form",
  EXPERIENCE_LETTER: "Experience letter",
  RELIEVING_LETTER: "Relieving letter",
  NOC: "No-objection certificate",
  SALARY_SLIP_PREV: "Previous employer salary slip",
  FORM_16: "Form 16 (TDS certificate)",
  PF_STATEMENT: "PF statement",
  BANK_PROOF: "Cancelled cheque / bank passbook",
  POLICE_CLEARANCE: "Police clearance certificate",
  OTHER: "Other document",
} as const;
export type HrDocumentType = keyof typeof HR_DOCUMENT_TYPES;

// ── Job application status ──────────────────────────────────────────────────

export const APPLICATION_STATUSES = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "ONBOARDED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer extended",
  ONBOARDED: "Onboarded",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const APPLICATION_STATUS_TAG: Record<ApplicationStatus, "blue" | "purple" | "cyan" | "green" | "teal" | "red" | "gray"> = {
  APPLIED: "blue",
  SCREENING: "cyan",
  INTERVIEW: "purple",
  OFFER: "teal",
  ONBOARDED: "green",
  REJECTED: "red",
  WITHDRAWN: "gray",
};

// ── Zod schemas ─────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  country: z.string().max(100).optional().default("India"),
});

export const HrProfileInput = z.object({
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  nationality: z.string().max(100).optional(),
  aadhaarNumber: z.string().max(12).nullable().optional(),
  panNumber: z.string().max(10).nullable().optional(),
  passportNumber: z.string().max(20).nullable().optional(),
  passportExpiry: z.string().nullable().optional(),
  passportCountry: z.string().nullable().optional(),
  voterId: z.string().nullable().optional(),
  drivingLicence: z.string().nullable().optional(),
  permanentAddress: AddressSchema.nullable().optional(),
  currentAddress: AddressSchema.nullable().optional(),
  sameAddress: z.boolean().optional(),
  personalEmail: z.string().email().nullable().optional(),
  personalPhone: z.string().nullable().optional(),
  emergencyContactName: z.string().max(100).nullable().optional(),
  emergencyContactRelation: z.string().max(100).nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankIfsc: z.string().max(11).nullable().optional(),
  bankName: z.string().max(100).nullable().optional(),
  bankBranch: z.string().max(100).nullable().optional(),
  pfUan: z.string().nullable().optional(),
  esicNumber: z.string().nullable().optional(),
});

export const JobApplicationInput = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  appliedRole: z.string().min(2).max(100),
  experienceYears: z.number().min(0).max(50).nullable().optional(),
  currentEmployer: z.string().nullable().optional(),
  currentSalaryPaise: z.number().int().nullable().optional(),
  expectedSalaryPaise: z.number().int().nullable().optional(),
  portfolioUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});
