import { describe, expect, it } from "vitest";
import {
  fitViewBoxToBounds,
  parseViewBoxString,
  zoomViewBox,
} from "./drawingViewport.js";

describe("drawingViewport", () => {
  it("parses viewBox strings", () => {
    expect(parseViewBoxString("0 0 1000 500")).toEqual({ x: 0, y: 0, w: 1000, h: 500 });
  });

  it("fits model bounds with padding", () => {
    const vb = fitViewBoxToBounds({ minX: 0, minY: 0, maxX: 100, maxY: 50 });
    expect(vb.x).toBeLessThan(0);
    expect(vb.w).toBeGreaterThan(100);
  });

  it("zooms toward a focus point", () => {
    const start = { x: 0, y: 0, w: 100, h: 100 };
    const z = zoomViewBox(start, 0.5, 50, 50);
    expect(z.w).toBe(50);
    expect(z.x).toBe(25);
    expect(z.y).toBe(25);
  });
});
