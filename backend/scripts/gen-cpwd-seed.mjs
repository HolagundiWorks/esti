/**
 * Generate backend/src/data/cpwd-rate-book.ts from the ESE CPWD pack.
 * Run from the backend/ dir after rebuilding the pack:
 *   pnpm --filter @esti/ese build-cpwd-pack
 *   node scripts/gen-cpwd-seed.mjs
 * The generated module is seeded into esti_rate_book by scripts/seedCpwdRates.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const packPath = resolve(here, "../../ese/packs/cpwd-2021.pack.json");
const outPath = resolve(here, "../src/data/cpwd-rate-book.ts");

const pack = JSON.parse(readFileSync(packPath, "utf8"));
const rates = pack.rateItems.map((r) => ({ code: r.code, description: r.shortName, unit: r.uom, ratePaise: r.ratePaise }));

const out = `/**
 * CPWD Delhi DSR ${pack.year} office rates — GENERATED from ese/packs/cpwd-2021.pack.json.
 * Do NOT edit by hand. Regenerate: \`node scripts/gen-cpwd-seed.mjs\` (from backend/).
 *
 * Seeded into esti_rate_book by scripts/seedCpwdRates.ts (idempotent). Rates only —
 * the specification catalogue stays rate-free; they join by \\\`code\\\`.
 */
export interface CpwdRate { code: string; description: string; unit: string; ratePaise: number }
export const CPWD_EDITION = ${JSON.stringify(pack.edition)};
export const CPWD_RATES: CpwdRate[] = JSON.parse(
  String.raw\`${JSON.stringify(rates)}\`,
) as CpwdRate[];
`;
writeFileSync(outPath, out);
console.log(`wrote ${outPath} — ${rates.length} rows`);
