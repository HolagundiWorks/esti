/**
 * Geometric snapping for drawing takeoff (ortho, grid, endpoints).
 */

export type Pt = { x: number; y: number };

export type SnapSettings = {
  ortho: boolean;
  grid: boolean;
  gridMm: number;
  endpoints: boolean;
  scaleUnitsPerVb: number | null;
  scaleUnit: string | null;
};

function mmPerVbUnit(scaleUnitsPerVb: number, scaleUnit: string): number {
  switch (scaleUnit.toLowerCase()) {
    case "mm":
      return scaleUnitsPerVb;
    case "cm":
      return scaleUnitsPerVb * 10;
    case "m":
      return scaleUnitsPerVb * 1000;
    default:
      return scaleUnitsPerVb;
  }
}

function gridStepVb(settings: SnapSettings): number | null {
  if (!settings.grid || !settings.scaleUnitsPerVb || !settings.scaleUnit) return null;
  const mmPerVb = mmPerVbUnit(settings.scaleUnitsPerVb, settings.scaleUnit);
  if (mmPerVb <= 0) return null;
  return settings.gridMm / mmPerVb;
}

function snapToGrid(p: Pt, step: number): Pt {
  return {
    x: Math.round(p.x / step) * step,
    y: Math.round(p.y / step) * step,
  };
}

function snapOrtho(origin: Pt, p: Pt): Pt {
  const dx = Math.abs(p.x - origin.x);
  const dy = Math.abs(p.y - origin.y);
  return dx >= dy ? { x: p.x, y: origin.y } : { x: origin.x, y: p.y };
}

function snapToNearest(p: Pt, candidates: Pt[], toleranceVb: number): Pt {
  let best = p;
  let bestD = toleranceVb;
  for (const c of candidates) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function applySnap(raw: Pt, last: Pt | null, settings: SnapSettings, endpoints: Pt[]): Pt {
  let p = raw;
  if (settings.ortho && last) p = snapOrtho(last, p);
  const step = gridStepVb(settings);
  if (step && step > 0) p = snapToGrid(p, step);
  if (settings.endpoints && endpoints.length) {
    const tol = step && step > 0 ? step * 0.6 : 500;
    p = snapToNearest(p, endpoints, tol);
  }
  return p;
}

export function extractSvgEndpoints(svgRoot: SVGSVGElement, max = 8000): Pt[] {
  const pts: Pt[] = [];
  const seen = new Set<string>();
  const add = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const key = `${x.toFixed(2)},${y.toFixed(2)}`;
    if (seen.has(key) || pts.length >= max) return;
    seen.add(key);
    pts.push({ x, y });
  };

  svgRoot.querySelectorAll("line").forEach((el) => {
    add(Number(el.getAttribute("x1")), Number(el.getAttribute("y1")));
    add(Number(el.getAttribute("x2")), Number(el.getAttribute("y2")));
  });

  svgRoot.querySelectorAll("polyline, polygon").forEach((el) => {
    const raw = el.getAttribute("points") ?? "";
    const nums = raw.trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) add(nums[i]!, nums[i + 1]!);
  });

  return pts;
}
