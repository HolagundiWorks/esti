import { z } from "zod";

// --- Letters ----------------------------------------------------------------

export const LetterCreate = z.object({
  projectId: z.string().uuid().optional(),
  recipient: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  dateLetter: z.string().date().optional(),
});
export type LetterCreate = z.infer<typeof LetterCreate>;

// --- Contracts (register) ---------------------------------------------------

export const ContractType = z.enum(["CLIENT", "CONSULTANT", "VENDOR", "OTHER"]);
export type ContractType = z.infer<typeof ContractType>;

export const ContractStatus = z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "TERMINATED"]);
export type ContractStatus = z.infer<typeof ContractStatus>;

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  CLIENT: "Client",
  CONSULTANT: "Consultant",
  VENDOR: "Vendor",
  OTHER: "Other",
};

export const ContractCreate = z.object({
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  party: z.string().min(1).max(200),
  contractType: ContractType.default("CLIENT"),
  valuePaise: z.number().int().nonnegative().default(0),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  notes: z.string().max(4000).optional(),
});
export type ContractCreate = z.infer<typeof ContractCreate>;
