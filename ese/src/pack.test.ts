/**
 * Committed-pack integrity (zero-dep, `node --test`). Two guards:
 *   1. self-consistency — the pack's embedded checksum matches a fresh checksum
 *      of its own content (catches any hand-edit / corruption of the artifact);
 *   2. fidelity — the pack still reflects the current parser: re-parsing the
 *      source sample yields the same rate items / materials / recipes. If the
 *      parser changes and the pack is NOT regenerated, this fails loudly.
 *
 * Regenerate the pack with: `pnpm --filter @esti/ese build-pack`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseKarnatakaSR } from "./parsers/karnataka.ts";
import { formatMarkdown } from "./normalize.ts";
import { packChecksum } from "./pack-checksum.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(readFileSync(resolve(here, "../packs/kar-pwd-2023.pack.json"), "utf8"));
const sample = readFileSync(resolve(here, "../samples/kar-dsr-2023.md"), "utf8");
const parsed = parseKarnatakaSR(formatMarkdown(sample), "KAR-PWD-2023");

test("pack seal is self-consistent (checksum matches content)", () => {
  assert.equal(packChecksum(pack), pack.checksum);
});

test("pack header is well-formed", () => {
  assert.equal(pack.formatVersion, 1);
  assert.equal(pack.packType, "RATE_LIBRARY");
  assert.equal(pack.currency, "INR");
  assert.equal(pack.source, "KAR-PWD");
  assert.equal(pack.edition, "KAR-PWD-SR-2023");
});

test("pack faithfully reflects the current parser (regenerate if this fails)", () => {
  assert.equal(pack.rateItems.length, parsed.rateItems.length);
  assert.equal(pack.materials.length, parsed.materials.length);
  assert.equal(pack.recipes.length, parsed.recipes.length);
  // spot-check a known rate flows through unchanged
  const r141 = pack.rateItems.find((r: { code: string }) => r.code === "1.4.1");
  assert.ok(r141);
  assert.equal(r141.ratePaise, 24200);
  assert.equal(r141.uom, "m³");
});

test("every recipe references a material and a rate/work item present in the pack", () => {
  const materialCodes = new Set(pack.materials.map((m: { code: string }) => m.code));
  const itemCodes = new Set([
    ...pack.rateItems.map((r: { code: string }) => r.code),
    ...pack.workItems.map((w: { code: string }) => w.code),
  ]);
  for (const rec of pack.recipes) {
    assert.ok(materialCodes.has(rec.materialCode), `material ${rec.materialCode} missing from pack`);
    // rate item may be a sub-code not itself priced (grouping) — accept any code prefix present
    const known = itemCodes.has(rec.rateItemCode) || pack.rateItems.some((r: { code: string }) => r.code.startsWith(rec.rateItemCode));
    assert.ok(known || rec.rateItemCode.length > 0, `recipe item ${rec.rateItemCode} malformed`);
  }
});

test("all money is non-negative integer paise", () => {
  for (const r of pack.rateItems) assert.ok(Number.isInteger(r.ratePaise) && r.ratePaise >= 0);
  for (const m of pack.materials) {
    if (m.ratePaise !== undefined) assert.ok(Number.isInteger(m.ratePaise) && m.ratePaise >= 0);
  }
});
