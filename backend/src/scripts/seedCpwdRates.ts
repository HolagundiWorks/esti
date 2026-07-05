/**
 * Seed the CPWD Delhi DSR office rates into the office rate book (esti_rate_book).
 *
 * Idempotent: skips entirely if this CPWD edition is already present (detected by
 * `notes = <edition>`), so it is safe to run on every deploy. Rates only — the
 * specification catalogue stays rate-free; an estimate re-costs by joining item
 * `code` → rate book `code`.
 */
import { eq } from "drizzle-orm";
import type { db as Db } from "../db/index.js";
import { rateBook } from "../db/schema.js";
import { CPWD_EDITION, CPWD_RATES } from "../data/cpwd-rate-book.js";

export async function seedCpwdRates(db: typeof Db): Promise<void> {
  const present = await db
    .select({ id: rateBook.id })
    .from(rateBook)
    .where(eq(rateBook.notes, CPWD_EDITION))
    .limit(1);
  if (present.length) {
    console.log(`✓ CPWD rate book already seeded (${CPWD_EDITION}); no change`);
    return;
  }

  const rows = CPWD_RATES.map((r) => ({
    code: r.code,
    description: r.description,
    unit: r.unit,
    ratePaise: r.ratePaise,
    notes: CPWD_EDITION,
    active: true,
  }));

  const CHUNK = 1000; // keep well under Postgres' bind-parameter limit
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(rateBook).values(rows.slice(i, i + CHUNK));
  }
  console.log(`✓ CPWD rate book seeded: ${rows.length} rates (${CPWD_EDITION})`);
}
