/**
 * Golden fixture test for the Karnataka SR parser. Uses Node's built-in test
 * runner (no extra dep): `node --test`. The fixture below is a compact but
 * faithful slice of ese/samples/kar-dsr-2023.md — real codes, units, rates and
 * DAR blocks, plus the OCR noise the parser must survive (watermark tokens,
 * a garbled-Kannada table, a machinery table, a materials row that merely
 * mentions "Royalty"). Every asserted value is the deterministic truth of the
 * source; this locks the parser against regressions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKarnatakaSR, extractAttributes } from "./karnataka.ts";

const FIXTURE = `
## Table 5  (pages 39)
Sl No. | Material Component | Unit | Basic Rate (Excl GST) in Rs.
--- | --- | --- | ---
1 | 2 | 3 | 4
 | Granular Aggregates |  |
1 | 20mm downsize | m<sup>3</sup> | 1333.00
2 | Sand - M-Sand | m<sup>3</sup> | 1476.00

## Table 6  (pages 40)
31 | Cement (OPC/PPC/PSC) | bag | 293.00
--- | --- | --- | ---
32 | Bricks (Modular) | each | 10.00
33 | Gravel 2.36mm downsize (Including Royalty) | m<sup>3</sup> | 288.00

## Table 10  (pages 43)
Sl. No. | Description | Unit | Operating Cost (Rs.) Excluding GST
--- | --- | --- | ---
1 | Concrete Mixer - 1 m3 | hr | 396.00
2 | Air Compressor -250 cfm | hr | 458.00

## Table 20  (pages 53)
SL | SR |  |  |  | Materia | l Co-efficient | s in m<sup>3</sup>
--- | --- | --- | --- | --- | --- | --- | ---
NO. | Volume | Item No | Material | Unit | Jelly Metal / Stone* | Sand | Murrum/ Soil
1 | I | 2.1.4 | PCC M 10 (1:3:6) using 20 mm nominal size | m<sup>3</sup> | 0.94 | 0.47 |
2 | I | 2.3.4 | RCC M 35 | m<sup>3</sup> | 0.90 | 0.45 |

## Table 22  (pages 78)
Item No. | Description of item | Unit | Rate\`
--- | --- | --- | ---
 | Manual Means |  |
1.4 | VOL-1 Earth work excavation by manual means for foundation in all kinds of soils |  |
1.4.1 | In all kinds of soils Depth upto 1.5 m | m³ | 242.00
 | Note: Cost of De-watering upto 5 % may be added |  |
2.3.4 | KPWD RCC M 35 using 20 mm nominal size graded aggregate in CM 1:4 | m³ | 8500.00

## Table 26  (pages 102)
Sl. No. | Specification | Unit | Qty | Rate \` | Amount
--- | --- | --- | --- | --- | ---
1.4.1 | In all kinds of soils Depth upto 1.5 m |  |  |  |
 | Details of cost for 10 m³ |  |  |  |
A | LABoUR |  |  |  |
 | Mazdoor Heavy | day | 0.70 | 589.00 | 412.30
 | Mazdoor Light | day | 2.70 | 589.00 | 1590.30
 | Cost per m³ |  |  |  | 242.00
2.3.4 | M 35 Design Mix Using 20 mm and down size graded crushed coarse aggregates |  |  |  |
 | Details of cost for 15 m³ . |  |  |  |
 | MATERIAL |  |  |  |
 | Cement | t | 5.85 | 5860.00 | 34281.00
 | Coarse sand | m³ | 6.75 | 1476.00 | 9963.00
 | 20 mm aggregate | m³ | 8.10 | 1333.00 | 10797.30
 | 10 mm aggregates | m³ | 5.40 | 1362.00 | 7354.80
 | LABoUR |  |  |  |
 | Mason | - day | 3.00 | 601.00 | 1803.00
 | MAChINERY |  |  |  |
 | Generator 100 kVA | hr | 0.75 | 1218.00 | 913.50

## Table 1  (pages 26)
¸ÀA¥ÀÄl | £ÉÆÃqÀ¯ï ªÀÈvÀÛUÀ¼ÀÄ | PÉÊUÉÆAqÀ PÀæªÀÄUÀ¼ÀÄ
--- | --- | ---
I | ¯ÉÆÃE ¨ÉAUÀ¼ÀÆgÀÄ ªÀÈvÀÛ | ¸ÀA¥ÀÄl-1
`;

const P = parseKarnatakaSR(FIXTURE);
const rate = (code: string) => P.rateItems.find((r) => r.code === code);
const recipesFor = (code: string) => P.recipes.filter((r) => r.rateItemCode === code);

test("schedule: rate, unit and parent itemCode read straight from Table 22", () => {
  const r = rate("1.4.1")!;
  assert.equal(r.uom, "m³");
  assert.equal(r.ratePaise, 24200); // ₹242.00
  assert.equal(r.itemCode, "1.4"); // parent derived from the code hierarchy
});

test("schedule: watermark stripped, Note rows skipped, parent captured as work item", () => {
  // "KPWD " watermark prefix must not leak into the description.
  assert.ok(rate("2.3.4")!.specification!.startsWith("RCC M 35"));
  // The "Note:" row under 1.4.1 must not become a rate item.
  assert.equal(P.rateItems.filter((r) => /Note/i.test(r.specification ?? "")).length, 0);
  // The unpriced parent 1.4 becomes a work item.
  assert.ok(P.workItems.some((w) => w.code === "1.4"));
});

test("attributes: grade / mortar / nominal size / thickness by regex (no LLM)", () => {
  assert.deepEqual(rate("2.3.4")!.attributes, { grade: "M35", mortar: "1:4", nominalSizeMm: "20" });
  assert.deepEqual(extractAttributes("Brick masonry 230mm th. in CM 1:6"), { mortar: "1:6", thicknessMm: "230" });
});

test("materials: Table 5 + header-less continuation (Table 6) parsed; column-number & sub-head rows skipped", () => {
  const cement = P.materials.find((m) => m.code === "cement-opc-ppc-psc");
  assert.ok(cement, "cement from the header-less Table 6 continuation must be captured");
  assert.equal(cement!.ratePaise, 29300); // ₹293.00/bag
  // A materials row mentioning "Royalty" must NOT drop the whole table.
  assert.ok(P.materials.some((m) => /gravel-2-36mm/.test(m.code)));
  // The "1 | 2 | 3 | 4" column-number row and "Granular Aggregates" sub-head are not materials.
  assert.ok(!P.materials.some((m) => m.name === "2" || m.name === "Granular Aggregates"));
});

test("machinery (unit hr) never leaks into the material master", () => {
  assert.equal(P.materials.filter((m) => m.unit === "hr").length, 0);
  assert.ok(!P.materials.some((m) => /concrete-mixer|air-compressor|generator/.test(m.code)));
});

test("Table 20 coefficients → recipes for items with no DAR breakdown", () => {
  const r = recipesFor("2.1.4");
  assert.equal(r.length, 2);
  assert.equal(r.find((x) => x.materialCode === "jelly-metal-stone")!.coefficient, 0.94);
  assert.equal(r.find((x) => x.materialCode === "sand")!.coefficient, 0.47);
  assert.ok(r.every((x) => x.via === "TABLE20"));
});

test("DAR block → per-unit MATERIAL coefficients (qty ÷ basis); labour & machinery excluded", () => {
  const r = recipesFor("2.3.4");
  const codes = r.map((x) => x.materialCode).sort();
  assert.deepEqual(codes, ["10-mm-aggregates", "20-mm-aggregate", "cement", "coarse-sand"]);
  assert.equal(r.find((x) => x.materialCode === "cement")!.coefficient, 0.39); // 5.85 / 15
  assert.equal(r.find((x) => x.materialCode === "20-mm-aggregate")!.coefficient, 0.54); // 8.10 / 15
  assert.ok(r.every((x) => x.via === "DAR"));
  // No labour (mason) or machinery (generator) recipe.
  assert.ok(!r.some((x) => /mason|generator/.test(x.materialCode)));
});

test("reconciliation: DAR wins — Table-20 jelly/sand dropped for an item that also has a DAR block", () => {
  const r = recipesFor("2.3.4");
  assert.ok(!r.some((x) => x.via === "TABLE20"), "Table-20 coefficients must be reconciled away when DAR exists");
});

test("earthwork DAR (labour only) yields no material recipes", () => {
  assert.equal(recipesFor("1.4.1").length, 0);
});

test("garbled-Kannada table is ignored (no bogus rate items)", () => {
  assert.ok(!P.rateItems.some((r) => /[ಀ-೿]/.test(r.specification ?? "")));
  assert.equal(P.rateItems.length, 2); // only 1.4.1 and 2.3.4 are priced
});
