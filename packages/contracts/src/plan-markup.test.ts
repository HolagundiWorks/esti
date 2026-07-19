import { describe, expect, it } from "vitest";
import {
  areaPointsToMm2,
  geometryAreaPoints,
  geometryBoundsPoints,
  geometryLengthPoints,
  type PlanMarkupGeometry,
} from "./plan-markup.js";

const rect = (w: number, h: number): PlanMarkupGeometry => ({
  kind: "RECT",
  points: [
    { x: 0, y: 0 },
    { x: w, y: h },
  ],
});

describe("geometryAreaPoints", () => {
  it("uses the bounding box for a rect", () => {
    expect(geometryAreaPoints(rect(40, 25))).toBe(1000);
  });

  it("shoelaces a closed polygon", () => {
    // 10x10 square with a 5x5 bite out of one corner -> 100 - 25 = 75
    const l: PlanMarkupGeometry = {
      kind: "POLYLINE",
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 10 },
        { x: 0, y: 10 },
      ],
    };
    expect(geometryAreaPoints(l)).toBe(75);
  });

  it("is unsigned — winding order does not matter", () => {
    const cw: PlanMarkupGeometry = {
      kind: "POLYLINE",
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 0 },
      ],
    };
    expect(geometryAreaPoints(cw)).toBe(16);
  });

  it("reports no area for shapes that do not enclose one", () => {
    const open: PlanMarkupGeometry = {
      kind: "POLYLINE",
      closed: false,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
      ],
    };
    expect(geometryAreaPoints(open)).toBe(0);
    expect(geometryAreaPoints({ kind: "LINE", points: [{ x: 0, y: 0 }, { x: 9, y: 9 }] })).toBe(0);
    expect(geometryAreaPoints({ kind: "POINT", points: [{ x: 1, y: 1 }] })).toBe(0);
    // A closed "polygon" of two points is degenerate.
    expect(
      geometryAreaPoints({
        kind: "POLYLINE",
        closed: true,
        points: [{ x: 0, y: 0 }, { x: 3, y: 3 }],
      }),
    ).toBe(0);
  });
});

describe("areaPointsToMm2", () => {
  it("scales area by the SQUARE of the linear calibration", () => {
    // 1 point = 100 mm, so 1 point² = 10,000 mm² — not 100.
    expect(areaPointsToMm2(1, 100)).toBe(10_000);
    expect(areaPointsToMm2(6, 50)).toBe(15_000);
  });

  it("gives a sane real-world figure end to end", () => {
    // A 40x25 point rect at 100 mm/point = 4000mm x 2500mm = 10 m².
    const mm2 = areaPointsToMm2(geometryAreaPoints(rect(40, 25)), 100);
    expect(mm2).toBe(10_000_000);
    expect(mm2 / 1_000_000).toBe(10); // SQM
  });
});

describe("existing helpers still behave", () => {
  it("measures polyline length and closes the loop when asked", () => {
    const open: PlanMarkupGeometry = {
      kind: "POLYLINE",
      points: [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
    };
    expect(geometryLengthPoints(open)).toBe(5);
    expect(
      geometryLengthPoints({
        kind: "POLYLINE",
        closed: true,
        points: [
          { x: 0, y: 0 },
          { x: 3, y: 0 },
          { x: 3, y: 4 },
        ],
      }),
    ).toBe(12); // 3 + 4 + 5
  });

  it("bounds a rect", () => {
    expect(geometryBoundsPoints(rect(40, 25))).toEqual({ width: 40, height: 25 });
  });
});
