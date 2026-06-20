import type { SeedActivationInput, SeedActivationResult } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { bbmpRuleSets, dsrVersions } from "../db/schema.js";
import { DEFAULT_BBMP_RULE_CATALOG } from "@hcw/india-compliance-kit/profiles/bbmp-2003";
import {
  OFFICIAL_SEED_CITIES,
  OFFICIAL_SEED_PACKS,
  officialCityByKey,
  officialPackById,
  packAppliesToCity,
} from "./kbOfficialSeedRegistry.js";
import { findOfficialDsrActivation, officialDsrVersionMeta } from "./dsrCatalog.js";

type ActivationRow = SeedActivationResult["packs"][number];

function resolveTargetCities(input: SeedActivationInput): string[] {
  if (input.cityKeys?.length) return input.cityKeys;
  return OFFICIAL_SEED_CITIES.map((c) => c.key);
}

function resolveTargetPacks(input: SeedActivationInput) {
  if (input.all) return OFFICIAL_SEED_PACKS;
  const ids = new Set(input.packIds ?? []);
  if (ids.size === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select packIds or set all=true",
    });
  }
  const packs = OFFICIAL_SEED_PACKS.filter((p) => ids.has(p.packId));
  if (packs.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No matching official packs" });
  }
  return packs;
}

async function activateDsrPack(
  db: DB,
  packId: string,
  cityKey: string | null,
): Promise<{ entityId: string; skipped: boolean }> {
  const meta = officialDsrVersionMeta(packId, cityKey);
  if (!meta) throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown DSR pack ${packId}` });

  const existing = await findOfficialDsrActivation(db, packId, cityKey);
  if (existing) return { entityId: existing.id, skipped: true };

  const [row] = await db
    .insert(dsrVersions)
    .values({
      label: meta.label,
      description: meta.description,
      source: meta.source,
      stateCode: meta.stateCode,
      status: "PUBLISHED",
      active: false,
      origin: "HCW_OFFICIAL",
      packId,
      readOnly: true,
      cityKey,
    })
    .returning();

  return { entityId: row!.id, skipped: false };
}

async function activateCompliancePack(
  db: DB,
  packId: string,
  cityKey: string,
): Promise<{ entityId: string; skipped: boolean }> {
  const city = officialCityByKey(cityKey);
  if (!city) throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown city ${cityKey}` });

  const [existing] = await db
    .select()
    .from(bbmpRuleSets)
    .where(and(eq(bbmpRuleSets.packId, packId), eq(bbmpRuleSets.cityKey, cityKey)))
    .limit(1);
  if (existing) return { entityId: existing.id, skipped: true };

  const label =
    packId === "compliance-bbmp-2003"
      ? `${DEFAULT_BBMP_RULE_CATALOG.label ?? "BBMP 2003"} (${city.label})`
      : packId;

  const [row] = await db
    .insert(bbmpRuleSets)
    .values({
      label,
      effectiveDate: "2003-01-01",
      status: "PUBLISHED",
      sourceCitation: "BBMP Building Bye-Laws 2003 — official HCW kit seed",
      notes: `Official read-only seed for ${city.label}. Catalog loaded from kit at runtime.`,
      active: false,
      origin: "HCW_OFFICIAL",
      packId,
      readOnly: true,
      cityKey,
      stateCode: city.stateCode,
      authorityId: "bbmp-2003",
    })
    .returning();

  return { entityId: row!.id, skipped: false };
}

export async function activateOfficialSeedPacks(
  db: DB,
  input: SeedActivationInput,
): Promise<SeedActivationResult> {
  const cities = resolveTargetCities(input);
  const packs = resolveTargetPacks(input);
  const activatedRows: ActivationRow[] = [];
  let activated = 0;
  let skipped = 0;

  for (const pack of packs) {
    if (pack.cityKeys.includes("*")) {
      const cityKey = null;
      if (pack.kind === "DSR") {
        const result = await activateDsrPack(db, pack.packId, cityKey);
        if (result.skipped) skipped += 1;
        else activated += 1;
        activatedRows.push({
          packId: pack.packId,
          kind: pack.kind,
          cityKey,
          entityId: result.entityId,
        });
      }
      continue;
    }

    for (const cityKey of cities) {
      if (!packAppliesToCity(pack, cityKey)) continue;
      if (!officialCityByKey(cityKey)) continue;

      if (pack.kind === "DSR") {
        const result = await activateDsrPack(db, pack.packId, cityKey);
        if (result.skipped) skipped += 1;
        else activated += 1;
        activatedRows.push({
          packId: pack.packId,
          kind: pack.kind,
          cityKey,
          entityId: result.entityId,
        });
      } else if (pack.kind === "COMPLIANCE") {
        const result = await activateCompliancePack(db, pack.packId, cityKey);
        if (result.skipped) skipped += 1;
        else activated += 1;
        activatedRows.push({
          packId: pack.packId,
          kind: pack.kind,
          cityKey,
          entityId: result.entityId,
        });
      }
    }
  }

  return { activated, skipped, packs: activatedRows };
}

export async function listSeedActivations(db: DB) {
  const [dsrRows, complianceRows] = await Promise.all([
    db.select().from(dsrVersions).where(eq(dsrVersions.origin, "HCW_OFFICIAL")),
    db.select().from(bbmpRuleSets).where(eq(bbmpRuleSets.origin, "HCW_OFFICIAL")),
  ]);

  return {
    dsr: dsrRows,
    compliance: complianceRows,
  };
}

export { OFFICIAL_SEED_CITIES, OFFICIAL_SEED_PACKS, officialPackById };
