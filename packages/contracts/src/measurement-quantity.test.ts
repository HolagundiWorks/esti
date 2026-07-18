import { describe, expect, it } from "vitest";
import { deriveMeasurementQuantity } from "./measurement-quantity.js";

describe("deriveMeasurementQuantity", () => {
  it("derives RMT from length", () => {
    expect(
      deriveMeasurementQuantity({
        measureKind: "L",
        uom: "RMT",
        lengthMm: 3500,
        breadthMm: null,
        heightMm: null,
      }),
    ).toBe(3.5);
  });

  it("derives SQM from L×B", () => {
    expect(
      deriveMeasurementQuantity({
        measureKind: "LB",
        uom: "SQM",
        lengthMm: 4000,
        breadthMm: 3000,
        heightMm: null,
      }),
    ).toBe(12);
  });

  it("derives CUM from L×B×H", () => {
    expect(
      deriveMeasurementQuantity({
        measureKind: "LBH",
        uom: "CUM",
        lengthMm: 4000,
        breadthMm: 3000,
        heightMm: 3000,
      }),
    ).toBe(36);
  });

  it("derives NOS from count", () => {
    expect(
      deriveMeasurementQuantity({
        measureKind: "COUNT",
        uom: "NOS",
        lengthMm: null,
        breadthMm: null,
        heightMm: null,
        count: 4,
      }),
    ).toBe(4);
  });
});
