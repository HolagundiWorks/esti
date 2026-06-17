import { sql } from "drizzle-orm";
import { DEFAULT_NUMBERING_SCOPES, NumberingPatterns } from "@esti/contracts";
import { financialYear } from "@esti/contracts";
import type { DB } from "../db/index.js";
import { getOrgSettings } from "./settings.js";

/**
 * Allocate the next gap-free number for a scope within the current financial
 * year, atomically (UPSERT … RETURNING). Never MAX(id)+1. See ADR-06.
 *
 * Prefix and padding come from org `numberingPatterns` when configured.
 *
 * @returns e.g. { fy: "2026-27", seq: 7, ref: "INV/2026-27/0007" }
 */
export async function nextRef(
  db: DB,
  scope: string,
  defaultPrefix: string,
  at: Date = new Date(),
): Promise<{ fy: string; seq: number; ref: string }> {
  const settings = await getOrgSettings(db);
  const parsed = NumberingPatterns.safeParse(settings.numberingPatterns ?? {});
  const patterns = parsed.success ? parsed.data : {};
  const defaults = DEFAULT_NUMBERING_SCOPES[scope];
  const override = patterns[scope] ?? {};
  const prefix = override.prefix ?? defaults?.prefix ?? defaultPrefix;
  const padding = override.padding ?? defaults?.padding ?? 4;

  const fy = financialYear(at);
  const rows = await db.execute<{ last_value: number }>(sql`
    INSERT INTO esti_sequence (scope, fy, last_value)
    VALUES (${scope}, ${fy}, 1)
    ON CONFLICT (scope, fy)
    DO UPDATE SET last_value = esti_sequence.last_value + 1
    RETURNING last_value
  `);
  const seq = Number(rows[0]?.last_value ?? 1);
  const ref = `${prefix}/${fy}/${String(seq).padStart(padding, "0")}`;
  return { fy, seq, ref };
}
