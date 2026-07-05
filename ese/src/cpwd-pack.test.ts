/**
 * Committed CPWD pack integrity (zero-dep, `node --test`): the pack's seal is
 * self-consistent, and it still reflects the parser applied to the committed
 * chapter CSVs. Regenerate with `pnpm --filter @esti/ese build-cpwd-pack`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parseCpwdSR } from "./parsers/cpwd.ts";
import { packChecksum } from "./pack-checksum.ts";

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = resolve(here, "../samples");
const COEFF = "COEFFICIENTS FOR CEMENT CONSUMPTION.csv";

const pack = JSON.parse(readFileSync(resolve(here, "../packs/cpwd-2021.pack.json"), "utf8"));

const files = readdirSync(samplesDir).filter((f) => f.toLowerCase().endsWith(".csv"));
const chapters = files.filter((f) => f !== COEFF).sort().map((f) => ({ name: f.replace(/\.csv$/i, ""), csv: readFileSync(join(samplesDir, f), "utf8") }));
const coefficientsCsv = files.includes(COEFF) ? readFileSync(join(samplesDir, COEFF), "utf8") : undefined;
const parsed = parseCpwdSR({ chapters, coefficientsCsv }, "CPWD-2021");

test("CPWD pack seal is self-consistent", () => {
  assert.equal(packChecksum(pack), pack.checksum);
});

test("CPWD pack header is well-formed", () => {
  assert.equal(pack.source, "CPWD");
  assert.equal(pack.edition, "CPWD-DSR-2021");
  assert.equal(pack.packType, "RATE_LIBRARY");
  assert.equal(pack.currency, "INR");
});

test("CPWD pack reflects the current parser over the committed CSVs (regenerate if this fails)", () => {
  assert.equal(pack.rateItems.length, parsed.rateItems.length);
  assert.equal(pack.recipes.length, parsed.recipes.length);
  assert.ok(pack.rateItems.length > 3000, "expected the full CPWD schedule");
  const e211 = pack.rateItems.find((r: { code: string }) => r.code === "2.1.1");
  assert.ok(e211);
  assert.equal(e211.ratePaise, 10700);
  assert.equal(e211.uom, "m²");
});

test("all CPWD rates are non-negative integer paise", () => {
  for (const r of pack.rateItems) assert.ok(Number.isInteger(r.ratePaise) && r.ratePaise >= 0);
});
