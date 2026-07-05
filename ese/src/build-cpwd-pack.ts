/**
 * build-cpwd-pack — read the CPWD SR chapter CSVs (+ the cement-coefficient CSV)
 * from a directory and emit one sealed CPWD Rate Library Pack. CPWD is the
 * product schedule; this is its build path (the markdown `build-pack` CLI is for
 * the Karnataka fixture).
 *
 *   pnpm --filter @esti/ese build-cpwd-pack -- \
 *     --dir samples --year 2021 --out packs/cpwd-2021.pack.json
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseCpwdSR } from "./parsers/cpwd.js";
import { packFromParsed } from "./pipeline.js";
import { stablePretty } from "./pack-checksum.js";

const COEFFICIENTS_FILE = "COEFFICIENTS FOR CEMENT CONSUMPTION.csv";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Read a CPWD sample directory → { chapters, coefficientsCsv }. */
export function readCpwdDir(dir: string): { chapters: { name: string; csv: string }[]; coefficientsCsv?: string } {
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".csv"));
  const chapters = files
    .filter((f) => f !== COEFFICIENTS_FILE)
    .sort()
    .map((f) => ({ name: f.replace(/\.csv$/i, ""), csv: readFileSync(join(dir, f), "utf8") }));
  const coeff = files.find((f) => f === COEFFICIENTS_FILE);
  return { chapters, coefficientsCsv: coeff ? readFileSync(join(dir, coeff), "utf8") : undefined };
}

function main(): void {
  const dir = resolve(arg("dir") ?? "samples");
  const year = Number(arg("year") ?? 2021);
  const outPath = resolve(arg("out") ?? `packs/cpwd-${year}.pack.json`);

  const input = readCpwdDir(dir);
  const parsed = parseCpwdSR(input, `CPWD-${year}`);
  const pack = packFromParsed({ source: "CPWD", year, edition: `CPWD-DSR-${year}` }, parsed);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, stablePretty(pack));

  process.stdout.write(
    `✅ CPWD Delhi DSR → ${outPath}\n` +
      `   edition ${pack.edition} · checksum ${pack.checksum.slice(0, 16)}…\n` +
      `   ${input.chapters.length} chapters · ${pack.rateItems.length} rate items · ` +
      `${pack.workItems.length} work items · ${pack.materials.length} materials · ${pack.recipes.length} recipes\n`,
  );
}

main();
