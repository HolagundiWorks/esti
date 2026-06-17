/** SVG viewBox pan/zoom helpers for the drawing takeoff viewer. */

export type ViewBox = { x: number; y: number; w: number; h: number };

export function parseViewBoxString(s: string): ViewBox {
  const parts = s.trim().split(/[\s,]+/).map(Number);
  return {
    x: parts[0] ?? 0,
    y: parts[1] ?? 0,
    w: Math.max(parts[2] ?? 100, 1e-6),
    h: Math.max(parts[3] ?? 100, 1e-6),
  };
}

export function viewBoxString(vb: ViewBox): string {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
}

export function zoomViewBox(vb: ViewBox, factor: number, focusX: number, focusY: number): ViewBox {
  const nw = vb.w * factor;
  const nh = vb.h * factor;
  const fx = (focusX - vb.x) / vb.w;
  const fy = (focusY - vb.y) / vb.h;
  return {
    x: focusX - nw * fx,
    y: focusY - nh * fy,
    w: nw,
    h: nh,
  };
}

export function panViewBox(vb: ViewBox, dx: number, dy: number): ViewBox {
  return { x: vb.x + dx, y: vb.y + dy, w: vb.w, h: vb.h };
}

export function fitViewBoxToBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  paddingRatio = 0.05,
): ViewBox {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w <= 0 || h <= 0) return { x: 0, y: 0, w: 100, h: 100 };
  const padX = w * paddingRatio;
  const padY = h * paddingRatio;
  return {
    x: bounds.minX - padX,
    y: bounds.minY - padY,
    w: w + padX * 2,
    h: h + padY * 2,
  };
}

export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = svg.createSVGPoint();
  p.x = clientX;
  p.y = clientY;
  const u = p.matrixTransform(ctm.inverse());
  return { x: u.x, y: u.y };
}

/** Strip the outer <svg> wrapper; return inner markup + declared viewBox. */
export function parseSvgMarkup(svg: string): { viewBox: ViewBox; inner: string } | null {
  const trimmed = svg.trim();
  if (!trimmed.includes("<svg")) return null;
  const vbMatch = trimmed.match(/viewBox=["']([^"']+)["']/i);
  const inner = trimmed
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  const viewBox = vbMatch ? parseViewBoxString(vbMatch[1]!) : { x: 0, y: 0, w: 100, h: 100 };
  return { viewBox, inner };
}
