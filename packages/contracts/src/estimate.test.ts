import { describe, expect, it } from "vitest";
import {
  EstimateFile,
  measureQty,
  measurementsTotal,
  takeoffMaterials,
  deriveLinked,
  recostAbstract,
  recostBOQ,
  recostMaterials,
  recostSteel,
  recostEstimate,
  steelFromBBS,
  type EstimateFile as EstimateFileT,
  type RateBookRates,
} from "./estimate.js";
import { computeMemberBBS } from "./bbs-engine.js";

// A small, realistic .aormsest: a 230mm brick wall (with a derived plaster line)
// plus a footing's steel — the shape the desktop app exports.
const FILE: EstimateFileT = EstimateFile.parse({
  formatVersion: 1,
  meta: { estimateName: "Villa GF", createdAt: "2026-07-05T00:00:00.000Z" },
  rateBook: { code: "OWN-2026", name: "Office rate book 2026-27" },
  items: [
    {
      code: "bw230",
      itemCode: "3",
      shortName: "Brick work 230mm",
      specification: "Brick masonry 230mm in CM 1:6",
      attributes: { thicknessMm: "230", mortar: "1:6" },
      uom: "m³",
      ratePaise: 800000, // ₹8000/m³ as-estimated
      measurements: [
        { desc: "GF wall A", nos: 1, l: 4.5, b: 0.23, h: 3.0, qty: 3.105 },
        { desc: "GF wall B", nos: 1, l: 2.3, b: 0.23, h: 3.0, qty: 1.587 },
      ],
      qty: 4.692,
      amountPaise: 3753600,
      section: "Masonry",
    },
    {
      code: "plaster12",
      itemCode: "13",
      shortName: "Cement plaster 12mm",
      uom: "m²",
      ratePaise: 25000, // ₹250/m²
      qty: 40.8, // two faces, net of openings (as frozen by the desktop)
      amountPaise: 1020000,
      section: "Finishing",
      derivedFrom: "bw230",
    },
  ],
  materials: [
    { code: "brick-modular", name: "Modular brick", unit: "Nos", qty: 2393, ratePaise: 900 },
    { code: "cement", name: "Cement", unit: "bag", qty: 12.5, ratePaise: 29300 },
    { code: "cement", name: "Cement", unit: "bag", qty: 7.5, ratePaise: 29300 }, // duplicate → aggregated
  ],
  steel: [
    { diaMm: 12, unitWeightKgM: 0.888, weightKg: 120, ratePaise: 6500 },
    { diaMm: 16, unitWeightKgM: 1.58, weightKg: 80, ratePaise: 6400 },
  ],
});

describe("measurement → quantity", () => {
  it("nos × present dimensions; nulls skipped", () => {
    expect(measureQty({ nos: 1, l: 4.5, b: 0.23, h: 3.0 })).toBe(3.105); // volume
    expect(measureQty({ nos: 2, l: 4.5, h: 3.0 })).toBe(27); // area × 2, b null
    expect(measureQty({ nos: 5 })).toBe(5); // pure count
  });
  it("sums a measurement sheet", () => {
    expect(measurementsTotal([{ qty: 3.105 }, { qty: 1.587 }])).toBe(4.692);
  });
});

describe("material take-off", () => {
  it("qty = itemQty × coefficient × (1 + wastage%)", () => {
    const lines = takeoffMaterials(10, [
      { materialCode: "cement", coefficient: 0.4, wastagePct: 0 },
      { materialCode: "brick-modular", coefficient: 500, wastagePct: 2.5 },
    ]);
    expect(lines.find((l) => l.materialCode === "cement")!.qty).toBe(4); // 10 × 0.4
    expect(lines.find((l) => l.materialCode === "brick-modular")!.qty).toBe(5125); // 10 × 500 × 1.025
  });
});

describe("derived measurements (measure once → linked quantities)", () => {
  it("FACTOR: plaster = brick face area × 2", () => {
    const d = deriveLinked(20, [{ childItemCode: "plaster12", rule: "FACTOR", factor: 2 }]);
    expect(d[0]).toEqual({ childItemCode: "plaster12", qty: 40, rule: "FACTOR" });
  });
  it("NET_OF_OPENINGS: subtract door/window area", () => {
    const d = deriveLinked(50, [{ childItemCode: "paint", rule: "NET_OF_OPENINGS", factor: 2 }], {
      openingsArea: { paint: 8 },
    });
    expect(d[0]!.qty).toBe(92); // 50 × 2 − 8
  });
  it("never goes negative", () => {
    const d = deriveLinked(1, [{ childItemCode: "x", rule: "NET_OF_OPENINGS", factor: 1 }], { openingsArea: { x: 99 } });
    expect(d[0]!.qty).toBe(0);
  });
});

describe("re-costing — abstract (quantities frozen, price is the lever)", () => {
  const rb: RateBookRates = {
    code: "DSR-2023",
    name: "Karnataka DSR 2023",
    itemRatePaise: { bw230: 750000 }, // book overrides brick; plaster falls back to estimate
    materialRatePaise: {},
    steelRatePaiseByDia: {},
  };
  it("book rate overrides; missing code falls back to as-estimated; variance is the rate delta", () => {
    const a = recostAbstract(FILE.items, rb);
    const brick = a.rows.find((r) => r.code === "bw230")!;
    expect(brick.rateSource).toBe("rateBook");
    expect(brick.ratePaise).toBe(750000);
    expect(brick.amountPaise).toBe(Math.round(4.692 * 750000)); // 3519000
    expect(brick.amountPaiseEstimated).toBe(Math.round(4.692 * 800000)); // 3753600
    expect(brick.variancePaise).toBe(brick.amountPaise - brick.amountPaiseEstimated); // negative

    const plaster = a.rows.find((r) => r.code === "plaster12")!;
    expect(plaster.rateSource).toBe("estimate");
    expect(plaster.ratePaise).toBe(25000);
  });
  it("totals reconcile", () => {
    const a = recostAbstract(FILE.items, rb);
    const sum = (f: (r: (typeof a.rows)[number]) => number) => a.rows.reduce((s, r) => s + f(r), 0);
    expect(a.totalCostedPaise).toBe(sum((r) => r.amountPaise));
    expect(a.totalEstimatedPaise).toBe(sum((r) => r.amountPaiseEstimated));
    expect(a.totalVariancePaise).toBe(a.totalCostedPaise - a.totalEstimatedPaise);
  });
  it("empty rate book = every line costs at its estimate (zero variance)", () => {
    const a = recostAbstract(FILE.items, { code: "x", name: "x", itemRatePaise: {}, materialRatePaise: {}, steelRatePaiseByDia: {} });
    expect(a.totalVariancePaise).toBe(0);
    expect(a.totalCostedPaise).toBe(a.totalEstimatedPaise);
  });
});

describe("leads (carriage) on items", () => {
  const rb: RateBookRates = { code: "x", name: "x", itemRatePaise: {}, materialRatePaise: {}, steelRatePaiseByDia: {} };
  const items = [
    {
      code: "agg",
      shortName: "20mm aggregate at site",
      uom: "m³",
      ratePaise: 133300,
      qty: 10,
      amountPaise: 1333000,
      attributes: {},
      measurements: [],
      lead: { km: 12, desc: "Carriage 12 km", chargePaise: 20000 }, // ₹200/m³ lead
    },
  ];
  it("lead adds qty × chargePaise to the amount", () => {
    const a = recostAbstract(items, rb);
    const r = a.rows[0]!;
    expect(r.leadAmountPaise).toBe(10 * 20000); // 200000
    expect(r.amountPaise).toBe(10 * 133300 + 10 * 20000); // base + lead
    expect(a.totalLeadPaise).toBe(200000);
  });
  it("lead cancels out of the variance (pure rate delta)", () => {
    const a = recostAbstract(items, { ...rb, itemRatePaise: { agg: 120000 } });
    const r = a.rows[0]!;
    expect(r.rateSource).toBe("rateBook");
    // variance is only the base-rate delta; lead is in both estimated and costed
    expect(r.variancePaise).toBe(10 * 120000 - 10 * 133300);
  });
});

describe("per-project rate book (overrides the office book)", () => {
  const rb: RateBookRates = {
    code: "OFFICE",
    name: "Office",
    itemRatePaise: { bw230: 750000 },
    materialRatePaise: {},
    steelRatePaiseByDia: {},
  };
  it("project override wins over office rate book and tags the source", () => {
    const a = recostAbstract(FILE.items, rb, { projectItemRatePaise: { bw230: 700000 } });
    const brick = a.rows.find((r) => r.code === "bw230")!;
    expect(brick.rateSource).toBe("project");
    expect(brick.ratePaise).toBe(700000);
  });
  it("falls back office → estimate when no project override", () => {
    const a = recostAbstract(FILE.items, rb, { projectItemRatePaise: {} });
    expect(a.rows.find((r) => r.code === "bw230")!.rateSource).toBe("rateBook");
    expect(a.rows.find((r) => r.code === "plaster12")!.rateSource).toBe("estimate");
  });
  it("threads through recostEstimate", () => {
    const costed = recostEstimate(FILE, rb, { projectItemRatePaise: { bw230: 700000 } });
    expect(costed.abstract.rows.find((r) => r.code === "bw230")!.rateSource).toBe("project");
  });
});

describe("BOQ — grouped abstract", () => {
  it("groups by section and subtotals to the abstract total", () => {
    const rb: RateBookRates = { code: "x", name: "x", itemRatePaise: {}, materialRatePaise: {}, steelRatePaiseByDia: {} };
    const boq = recostBOQ(FILE.items, rb);
    expect(boq.sections.map((s) => s.section).sort()).toEqual(["Finishing", "Masonry"]);
    const total = boq.sections.reduce((s, sec) => s + sec.subtotalPaise, 0);
    expect(total).toBe(boq.totalPaise);
  });
});

describe("materials summary — aggregate + re-price", () => {
  it("duplicate material codes aggregate; rate book re-prices, else estimate", () => {
    const rb: RateBookRates = { code: "x", name: "x", itemRatePaise: {}, materialRatePaise: { cement: 30000 }, steelRatePaiseByDia: {} };
    const { rows, totalPaise } = recostMaterials(FILE.materials, rb);
    const cement = rows.find((r) => r.code === "cement")!;
    expect(cement.qty).toBe(20); // 12.5 + 7.5 aggregated
    expect(cement.rateSource).toBe("rateBook");
    expect(cement.amountPaise).toBe(20 * 30000);
    const brick = rows.find((r) => r.code === "brick-modular")!;
    expect(brick.rateSource).toBe("estimate");
    expect(totalPaise).toBe(rows.reduce((s, r) => s + r.amountPaise, 0));
  });
});

describe("steel summary + BBS bridge", () => {
  it("prices steel by weight, by diameter", () => {
    const rb: RateBookRates = { code: "x", name: "x", itemRatePaise: {}, materialRatePaise: {}, steelRatePaiseByDia: { "12": 7000 } };
    const { rows, totalWeightKg, totalPaise } = recostSteel(FILE.steel, rb);
    expect(totalWeightKg).toBe(200);
    const d12 = rows.find((r) => r.diaMm === 12)!;
    expect(d12.rateSource).toBe("rateBook");
    expect(d12.amountPaise).toBe(120 * 7000);
    expect(rows.find((r) => r.diaMm === 16)!.rateSource).toBe("estimate");
    expect(totalPaise).toBe(rows.reduce((s, r) => s + r.amountPaise, 0));
  });
  it("steelFromBBS converts a computed member into priced steel lines", () => {
    const footing = computeMemberBBS({
      element: "FOOTING",
      lengthMm: 2000,
      widthMm: 2000,
      xDiaMm: 12,
      xSpacingMm: 150,
      yDiaMm: 12,
      ySpacingMm: 150,
      concreteGradeMpa: 25,
      steelGrade: "Fe500",
    });
    const lines = steelFromBBS([footing], { 12: 6500 });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.diaMm).toBe(12);
    expect(lines[0]!.weightKg).toBeGreaterThan(0);
    expect(lines[0]!.amountPaise).toBe(Math.round(lines[0]!.weightKg * 6500));
    expect(lines[0]!.unitWeightKgM).toBeCloseTo(0.889, 3);
  });
});

describe("whole-estimate re-cost", () => {
  it("grand total is the item abstract total (materials/steel are take-off, not additive)", () => {
    const rb: RateBookRates = { code: "x", name: "x", itemRatePaise: {}, materialRatePaise: {}, steelRatePaiseByDia: {} };
    const costed = recostEstimate(FILE, rb);
    expect(costed.grandTotalPaise).toBe(costed.abstract.totalCostedPaise);
    expect(costed.boq.totalPaise).toBe(costed.abstract.totalCostedPaise);
    expect(costed.materials.rows.length).toBeGreaterThan(0);
    expect(costed.steel.totalWeightKg).toBe(200);
  });
});

describe(".aormsest schema", () => {
  it("validates the interchange file and applies defaults", () => {
    expect(FILE.formatVersion).toBe(1);
    expect(FILE.meta.currency).toBe("INR"); // defaulted
    expect(FILE.items[0]!.attributes.thicknessMm).toBe("230");
  });
  it("all money is non-negative integer paise", () => {
    for (const it of FILE.items) expect(Number.isInteger(it.ratePaise) && it.ratePaise >= 0).toBe(true);
  });
});
