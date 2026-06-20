import { z } from "zod";

/** Official HCW repo packs are read-only; custom packs are firm-editable. */
export const KbSeedOrigin = z.enum(["HCW_OFFICIAL", "CUSTOM"]);
export type KbSeedOrigin = z.infer<typeof KbSeedOrigin>;

export const KbSeedPackKind = z.enum(["DSR", "COMPLIANCE"]);
export type KbSeedPackKind = z.infer<typeof KbSeedPackKind>;

export const OfficialSeedCity = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  stateCode: z.string().min(1).max(12),
  district: z.string().max(80).optional(),
});
export type OfficialSeedCity = z.infer<typeof OfficialSeedCity>;

export const OfficialSeedPack = z.object({
  packId: z.string().min(1).max(60),
  kind: KbSeedPackKind,
  label: z.string().min(1).max(120),
  description: z.string().max(400),
  maintainer: z.string().min(1).max(120),
  /** City keys this pack applies to; `*` = all cities (e.g. CPWD). */
  cityKeys: z.array(z.string().min(1).max(40)).min(1),
  readOnly: z.literal(true),
});
export type OfficialSeedPack = z.infer<typeof OfficialSeedPack>;

export const SeedActivationInput = z.object({
  /** When true, activate every official pack for selected cities. */
  all: z.boolean().default(false),
  packIds: z.array(z.string().min(1).max(60)).optional(),
  cityKeys: z.array(z.string().min(1).max(40)).min(1).optional(),
});
export type SeedActivationInput = z.infer<typeof SeedActivationInput>;

export const SeedActivationResult = z.object({
  activated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  packs: z.array(
    z.object({
      packId: z.string(),
      kind: KbSeedPackKind,
      cityKey: z.string().nullable(),
      entityId: z.string().uuid(),
    }),
  ),
});
export type SeedActivationResult = z.infer<typeof SeedActivationResult>;

export const HCW_SEED_MAINTAINER = "Holagundi Consulting Works";
