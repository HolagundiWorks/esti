/**
 * Enrichment invariants (zero-dep, `node --test`). Proves the LLM layer can only
 * ADD metadata: rates and coefficients are never mutated, parsed attributes win
 * over suggestions, and material links reconcile recipes to the master.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEnrichment, enrichPack, extractJson, type Enrichment, type LlmCall } from "./enrich.ts";
import type { ParsedSR } from "./registry.ts";

const SAMPLE: ParsedSR = {
  workItems: [{ code: "3", name: "Masonry" }],
  rateItems: [
    { code: "3.1", itemCode: "3", shortName: "Brick wall 230mm", specification: "Brick wall 230mm in CM 1:6", attributes: { thicknessMm: "230" }, uom: "m³", ratePaise: 800000, source: "KAR-PWD-2023" },
    { code: "3.2", itemCode: "3", shortName: "Plaster 12mm", specification: "Cement plaster 12mm", attributes: {}, uom: "m²", ratePaise: 25000, source: "KAR-PWD-2023" },
  ],
  materials: [
    { code: "cement-opc-ppc-psc", name: "Cement (OPC/PPC/PSC)", unit: "bag", ratePaise: 29300 },
    { code: "cement", name: "Cement", unit: "t", ratePaise: 586000 }, // DAR-discovered duplicate
  ],
  recipes: [{ rateItemCode: "3.1", materialCode: "cement", coefficient: 0.39, wastagePct: 0 }],
};

test("applyEnrichment: rates and coefficients are never mutated", () => {
  const e: Enrichment = {
    attributeSuggestions: [{ code: "3.2", attributes: { discipline: "Finishing" } }],
    materialLinks: [{ from: "cement", to: "cement-opc-ppc-psc" }],
  };
  const r = applyEnrichment(SAMPLE, e);
  assert.equal(r.rateItems.find((x) => x.code === "3.1")!.ratePaise, 800000);
  assert.equal(r.rateItems.find((x) => x.code === "3.2")!.ratePaise, 25000);
  assert.equal(r.recipes[0]!.coefficient, 0.39);
});

test("applyEnrichment: parsed attributes always win; gaps filled", () => {
  const e: Enrichment = {
    attributeSuggestions: [
      { code: "3.1", attributes: { thicknessMm: "999", finish: "fair-faced" } }, // thicknessMm must NOT override
      { code: "3.2", attributes: { discipline: "Finishing" } },
    ],
    materialLinks: [],
  };
  const r = applyEnrichment(SAMPLE, e);
  const w = r.rateItems.find((x) => x.code === "3.1")!;
  assert.equal(w.attributes.thicknessMm, "230"); // parsed wins
  assert.equal(w.attributes.finish, "fair-faced"); // gap filled
  assert.equal(r.rateItems.find((x) => x.code === "3.2")!.attributes.discipline, "Finishing");
});

test("applyEnrichment: material link reconciles recipe + drops the orphan duplicate", () => {
  const e: Enrichment = { attributeSuggestions: [], materialLinks: [{ from: "cement", to: "cement-opc-ppc-psc" }] };
  const r = applyEnrichment(SAMPLE, e);
  assert.equal(r.recipes[0]!.materialCode, "cement-opc-ppc-psc"); // recipe re-pointed
  assert.ok(!r.materials.some((m) => m.code === "cement")); // duplicate removed
  assert.ok(r.materials.some((m) => m.code === "cement-opc-ppc-psc")); // master kept
});

test("applyEnrichment: a link to an unknown master is ignored (no data loss)", () => {
  const e: Enrichment = { attributeSuggestions: [], materialLinks: [{ from: "cement", to: "does-not-exist" }] };
  const r = applyEnrichment(SAMPLE, e);
  assert.equal(r.recipes[0]!.materialCode, "cement"); // unchanged
  assert.ok(r.materials.some((m) => m.code === "cement")); // not dropped
});

test("extractJson pulls the first JSON object out of chatty output", () => {
  assert.deepEqual(extractJson('Sure! Here: {"grade":"M25"} hope that helps'), { grade: "M25" });
  assert.deepEqual(extractJson('[{"from":"a","to":"b"}] done'), [{ from: "a", to: "b" }]);
  assert.equal(extractJson("no json here"), null);
  assert.equal(extractJson("{ broken json "), null);
});

test("enrichPack: defensive against garbage model output (no throw, no bad data)", async () => {
  const garbage: LlmCall = async () => "the model rambled and returned nothing useful";
  const e = await enrichPack(SAMPLE, garbage);
  assert.deepEqual(e.attributeSuggestions, []);
  assert.deepEqual(e.materialLinks, []);
});

test("enrichPack: only queries bare items and proposes valid links", async () => {
  const calls: string[] = [];
  const fake: LlmCall = async (p) => {
    calls.push(p);
    if (p.includes("Item 3.2")) return '{"discipline":"Finishing","junk":123}';
    if (p.includes("MASTER:")) return '[{"from":"cement","to":"cement-opc-ppc-psc"},{"from":"x","to":"nope"}]';
    return "{}";
  };
  const e = await enrichPack(SAMPLE, fake);
  // 3.1 already has an attribute → not queried; only 3.2 (bare) is.
  assert.ok(calls.some((c) => c.includes("Item 3.2")));
  assert.ok(!calls.some((c) => c.includes("Item 3.1")));
  assert.deepEqual(e.attributeSuggestions, [{ code: "3.2", attributes: { discipline: "Finishing" } }]);
  // invalid link (to "nope" not in master) filtered out
  assert.deepEqual(e.materialLinks, [{ from: "cement", to: "cement-opc-ppc-psc" }]);
});
