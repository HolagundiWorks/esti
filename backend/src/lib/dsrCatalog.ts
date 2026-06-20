import type { DsrImportRow } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { dsrItems, dsrVersions, type dsrVersions as dsrVersionsTable } from "../db/schema.js";
import {
  buildingDsrCatalogItems,
  cpwdBuildingDsrItems,
  KA_BUILDING_DSR_REF,
  CPWD_BUILDING_DSR_REF,
} from "@hcw/master-dsr-kit";

export type DsrVersionRow = typeof dsrVersionsTable.$inferSelect;

export type ResolvedDsrItem = {
  id: string;
  versionId: string;
  code: string;
  description: string;
  unit: string;
  ratePaise: number;
  fromKit: boolean;
};

export function isOfficialReadOnlyVersion(version: Pick<DsrVersionRow, "readOnly" | "origin">): boolean {
  return version.readOnly || version.origin === "HCW_OFFICIAL";
}

export function assertDsrVersionWritable(version: DsrVersionRow): void {
  if (isOfficialReadOnlyVersion(version)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Official HCW seed data is read-only. Create a custom DSR version to edit or import.",
    });
  }
}

function kitItemsForPack(packId: string | null | undefined): DsrImportRow[] {
  switch (packId) {
    case "dsr-ka-building-2026":
      return buildingDsrCatalogItems();
    case "dsr-cpwd-building-2026":
      return cpwdBuildingDsrItems();
    default:
      return [];
  }
}

export async function resolveDsrItemsForVersion(
  db: DB,
  version: DsrVersionRow,
): Promise<ResolvedDsrItem[]> {
  if (isOfficialReadOnlyVersion(version) && version.packId) {
    return kitItemsForPack(version.packId).map((item) => ({
      id: `hcw:${item.code}`,
      versionId: version.id,
      code: item.code,
      description: item.description,
      unit: item.unit,
      ratePaise: item.ratePaise,
      fromKit: true,
    }));
  }

  const rows = await db
    .select()
    .from(dsrItems)
    .where(eq(dsrItems.versionId, version.id))
    .orderBy(asc(dsrItems.code));

  return rows.map((row) => ({
    id: row.id,
    versionId: row.versionId,
    code: row.code,
    description: row.description,
    unit: row.unit,
    ratePaise: row.ratePaise,
    fromKit: false,
  }));
}

export async function getDsrVersionOrThrow(db: DB, versionId: string): Promise<DsrVersionRow> {
  const [version] = await db.select().from(dsrVersions).where(eq(dsrVersions.id, versionId));
  if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "DSR version not found" });
  return version;
}

export async function resolveDsrItemRefsForVersion(
  db: DB,
  versionId: string,
): Promise<Array<{ id: string; code: string; description: string; unit: string; ratePaise: number }>> {
  const version = await getDsrVersionOrThrow(db, versionId);
  const items = await resolveDsrItemsForVersion(db, version);
  return items.map((i) => ({
    id: i.id,
    code: i.code,
    description: i.description,
    unit: i.unit,
    ratePaise: i.ratePaise,
  }));
}

export function dsrItemsToCsv(
  items: Array<{ code: string; description: string; unit: string; ratePaise: number }>,
): string {
  const header = "code,description,unit,rate";
  const lines = items.map((i) => {
    const rate = (i.ratePaise / 100).toFixed(2);
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [esc(i.code), esc(i.description), esc(i.unit), rate].join(",");
  });
  return [header, ...lines].join("\n");
}

export function officialDsrVersionMeta(packId: string, cityKey: string | null) {
  switch (packId) {
    case "dsr-ka-building-2026":
      return {
        label: cityKey ? `${KA_BUILDING_DSR_REF.label} (${cityKey})` : KA_BUILDING_DSR_REF.label,
        description: `Official HCW seed — Karnataka SSR building rates. City: ${cityKey ?? "state"}.`,
        source: KA_BUILDING_DSR_REF.source,
        stateCode: KA_BUILDING_DSR_REF.stateCode ?? null,
      };
    case "dsr-cpwd-building-2026":
      return {
        label: CPWD_BUILDING_DSR_REF.label,
        description: "Official HCW seed — CPWD central building schedule (national).",
        source: CPWD_BUILDING_DSR_REF.source,
        stateCode: null,
      };
    default:
      return null;
  }
}

export async function findOfficialDsrActivation(
  db: DB,
  packId: string,
  cityKey: string | null,
): Promise<DsrVersionRow | undefined> {
  const where = cityKey
    ? and(eq(dsrVersions.packId, packId), eq(dsrVersions.cityKey, cityKey))
    : and(eq(dsrVersions.packId, packId));
  const [row] = await db.select().from(dsrVersions).where(where).limit(1);
  return row;
}
