import { sql } from "drizzle-orm";
import { financialYear } from "@esti/contracts";
import type { DB } from "../db/index.js";

/**
 * Allocate the next gap-free number for a scope within the current financial
 * year, atomically (UPSERT … RETURNING). Never MAX(id)+1. See ADR-06.
 *
 * @returns e.g. { fy: "2026-27", seq: 7, ref: "INV/2026-27/0007" }
 */
export async function nextRef(
  db: DB,
  scope: string,
  prefix: string,
  at: Date = new Date(),
): Promise<{ fy: string; seq: number; ref: string }> {
  const fy = financialYear(at);
  const rows = await db.execute<{ last_value: number }>(sql`
    INSERT INTO esti_sequence (scope, fy, last_value)
    VALUES (${scope}, ${fy}, 1)
    ON CONFLICT (scope, fy)
    DO UPDATE SET last_value = esti_sequence.last_value + 1
    RETURNING last_value
  `);
  const seq = Number(rows[0]?.last_value ?? 1);
  const ref = `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;
  return { fy, seq, ref };
}
