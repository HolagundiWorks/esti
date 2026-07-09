import { z } from "zod";

/** Platform account lifecycle — licence manager may suspend or soft-delete. */
export const AccountStatus = z.enum(["ACTIVE", "SUSPENDED", "DELETED"]);
export type AccountStatus = z.infer<typeof AccountStatus>;

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DELETED: "Deleted",
};

/** Freelancer vs firm — signup profile only (not chart-of-accounts `AccountKind`). */
export const PracticeKind = z.enum(["FREELANCER", "FIRM"]);
export type PracticeKind = z.infer<typeof PracticeKind>;

export const AccountDiscipline = z.enum([
  "ARCHITECTURE",
  "INTERIOR",
  "LANDSCAPE",
  "MULTI_DISCIPLINE",
  "OTHER",
]);
export type AccountDiscipline = z.infer<typeof AccountDiscipline>;

export const ACCOUNT_DISCIPLINE_LABEL: Record<AccountDiscipline, string> = {
  ARCHITECTURE: "Architecture",
  INTERIOR: "Interior design",
  LANDSCAPE: "Landscape",
  MULTI_DISCIPLINE: "Multi-discipline",
  OTHER: "Other",
};

export const AccountTeamSize = z.enum(["SOLO", "2_5", "6_15", "16_50", "50_PLUS"]);
export type AccountTeamSize = z.infer<typeof AccountTeamSize>;

export const ACCOUNT_TEAM_SIZE_LABEL: Record<AccountTeamSize, string> = {
  SOLO: "Solo",
  "2_5": "2–5 people",
  "6_15": "6–15 people",
  "16_50": "16–50 people",
  "50_PLUS": "50+ people",
};

/** Indian states and UTs — billing and practice location. */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const IndianState = z.enum(INDIAN_STATES);
export type IndianState = z.infer<typeof IndianState>;

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const WEBSITE_RE = /^https?:\/\/.+/i;
const NAME_PREFIX_RE = /^[A-Za-z]{1,10}\.?$/;

/** Common professional prefixes — editable on the AORMS account profile. */
export const NAME_PREFIX_PRESETS = [
  { value: "", label: "None" },
  { value: "Ar.", label: "Ar. (Architect)" },
  { value: "Er.", label: "Er. (Engineer)" },
  { value: "Dr.", label: "Dr." },
] as const;

/**
 * Prefix for greetings and salutations. Explicit `namePrefix` wins; otherwise
 * COA registration implies Ar.
 */
export function resolveNamePrefix(
  profile: { namePrefix?: string; coaRegistrationNo?: string } | null | undefined,
): string {
  const custom = profile?.namePrefix?.trim();
  if (custom) {
    return custom.endsWith(".") ? custom : `${custom}.`;
  }
  if (profile?.coaRegistrationNo?.trim()) {
    return "Ar.";
  }
  return "";
}

/** First given name with optional professional prefix — e.g. "Ar. Vihaan". */
export function greetingGivenName(
  fullName: string,
  profile?: { namePrefix?: string; coaRegistrationNo?: string } | null,
): string {
  const first = fullName.trim().split(/\s+/).filter(Boolean)[0];
  if (!first) return "there";
  const prefix = resolveNamePrefix(profile);
  return prefix ? `${prefix} ${first}` : first;
}

function refineSignupProfile(
  v: {
    accountKind: PracticeKind;
    teamSize: AccountTeamSize;
    gstin?: string;
    website?: string;
    namePrefix?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (v.gstin && v.gstin.length > 0 && !GSTIN_RE.test(v.gstin)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid GSTIN", path: ["gstin"] });
  }
  if (v.website && v.website.length > 0 && !WEBSITE_RE.test(v.website)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid website URL", path: ["website"] });
  }
  if (v.namePrefix && v.namePrefix.length > 0 && !NAME_PREFIX_RE.test(v.namePrefix)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Use letters only (e.g. Ar. or Er.)",
      path: ["namePrefix"],
    });
  }
  if (v.accountKind === "FIRM" && v.teamSize === "SOLO") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select team size for a firm account",
      path: ["teamSize"],
    });
  }
  if (v.accountKind === "FREELANCER" && v.teamSize !== "SOLO") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Freelancer accounts are solo",
      path: ["teamSize"],
    });
  }
}

const AccountSignupProfileBase = z.object({
  namePrefix: z.string().trim().max(12).optional(),
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(8).max(20),
  firmName: z.string().trim().min(2).max(200),
  accountKind: PracticeKind,
  teamSize: AccountTeamSize,
  discipline: AccountDiscipline,
  city: z.string().trim().min(2).max(80),
  state: IndianState,
  coaRegistrationNo: z.string().trim().max(40).optional(),
  gstin: z.string().trim().max(15).optional(),
  website: z.string().trim().max(200).optional(),
});

/**
 * Standard signup / account profile captured at registration and editable
 * under AORMS Account → Profile.
 */
export const AccountSignupProfile = AccountSignupProfileBase.superRefine(refineSignupProfile);

export type AccountSignupProfile = z.infer<typeof AccountSignupProfile>;

/** Partial update — merged with existing profile server-side; at least one field required. */
export const AccountSignupProfileUpdate = AccountSignupProfileBase.partial()
  .refine((o) => Object.keys(o).length > 0, { message: "No fields to update" })
  .superRefine((v, ctx) => {
    if (
      v.accountKind !== undefined ||
      v.teamSize !== undefined ||
      v.gstin !== undefined ||
      v.website !== undefined ||
      v.namePrefix !== undefined
    ) {
      refineSignupProfile(
        {
          accountKind: v.accountKind ?? "FIRM",
          teamSize: v.teamSize ?? "2_5",
          gstin: v.gstin,
          website: v.website,
          namePrefix: v.namePrefix,
        },
        ctx,
      );
    }
  });

export type AccountSignupProfileUpdate = z.infer<typeof AccountSignupProfileUpdate>;
