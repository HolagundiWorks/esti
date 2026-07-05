/**
 * Golden fixture test for the CPWD CSV parser (`node --test`). Compact but
 * faithful slice of the real CPWD chapter CSVs — parent rows, sub-item rows,
 * standalone priced items, quoted descriptions with commas, the Hindi duplicate
 * rows (hyphen codes) that must be skipped, and the cement-coefficient file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCpwdSR } from "./cpwd.ts";

const EARTH = `Item No.,Description,Unit,Rate,,
2.1,"Earth work in surface excavation not exceeding 30 cm in depth, including disposal upto 50 m :",,,,
,2.1.1 All kinds of soil,sqm,107.00,,
2.4,Deduct for not rolling with power roller,cum,4.40,,
2-1,"feVVh dk dke ]lrgh [kqnkbZ garbled hindi",,,,
,2-1-1 lHkh izdkj dh feVVh,oxZ eh-,107-00,,
`;

const CONCRETE = `Item No.,Description,Unit,Rate,,
4.1.2,"1:1½:3 (1 Cement : 1½ coarse sand derived from natural sources : 3 graded stone aggregate 20 mm nominal size)",cum,8000.00,,
`;

const COEFF = `Item No.,Description,Unit,Quantity of cement,,
,No.,,per unit quantity of,,
4.1.2,1:1½:3 (1 Cement : 1½ coarse sand : 3 graded stone aggregate 20 mm nominal size),cum,4.00,,
4.1.3,1:2:4 (1 Cement : 2 coarse sand : 4 graded stone aggregate 20 mm),cum,3.20,,
`;

const P = parseCpwdSR({ chapters: [{ name: "Earth Work", csv: EARTH }, { name: "Concrete Works", csv: CONCRETE }], coefficientsCsv: COEFF }, "CPWD-2021");
const item = (code: string) => P.rateItems.find((r) => r.code === code);
const recipesFor = (code: string) => P.recipes.filter((r) => r.rateItemCode === code);

test("CSV parser handles quoted fields with embedded commas", () => {
  const rows = parseCsv('a,"b, still b",c\n1,2,3\n');
  assert.deepEqual(rows[0], ["a", "b, still b", "c"]);
  assert.deepEqual(rows[1], ["1", "2", "3"]);
});

test("sub-item: code embedded in description, rate + unit read, parent itemCode derived", () => {
  const r = item("2.1.1")!;
  assert.equal(r.uom, "m²"); // sqm → m²
  assert.equal(r.ratePaise, 10700); // ₹107.00
  assert.equal(r.itemCode, "2.1");
  assert.equal(r.shortName, "All kinds of soil"); // leading code stripped
});

test("standalone priced item (code in col0 + unit + rate)", () => {
  const r = item("2.4")!;
  assert.equal(r.uom, "m³"); // cum → m³
  assert.equal(r.ratePaise, 440);
});

test("parent row (colon, no rate) becomes a work item, not a rate item", () => {
  assert.equal(item("2.1"), undefined);
  assert.ok(P.workItems.some((w) => w.code === "2.1" && w.discipline === "Earth Work"));
});

test("Hindi duplicate rows (hyphen codes) are skipped entirely", () => {
  assert.equal(P.rateItems.filter((r) => r.code.includes("-")).length, 0);
  assert.equal(P.rateItems.length, 3); // 2.1.1, 2.4, 4.1.2 — nothing Hindi
});

test("attributes: mortar/concrete mix + nominal size by regex", () => {
  const c = item("4.1.2")!;
  assert.equal(c.attributes.mix, "1:1½:3");
  assert.equal(c.attributes.nominalSizeMm, "20");
  assert.equal(c.ratePaise, 800000);
});

test("cement coefficients → recipes only for items that are real rate items", () => {
  const r = recipesFor("4.1.2");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.materialCode, "cement");
  assert.equal(r[0]!.coefficient, 4); // 4.00 quintals per cum
  // 4.1.3 has a coefficient but no rate item in the chapters → filtered out
  assert.equal(recipesFor("4.1.3").length, 0);
  assert.ok(P.materials.some((m) => m.code === "cement"));
});
