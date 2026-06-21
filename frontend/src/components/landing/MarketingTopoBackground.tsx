import { useMemo } from "react";

// Anisotropic Gaussian peaks — each defines a terrain feature.
// x,y: centre (1440×960 space)  amp: peak height  sX/sY: spread  rot: tilt (rad)
type Peak = { x: number; y: number; amp: number; sX: number; sY: number; rot: number };

const PEAKS: Peak[] = [
  { x: 380,  y: 260, amp: 1.00, sX: 265, sY: 202, rot:  0.30 }, // main massif NW
  { x: 940,  y: 380, amp: 0.80, sX: 218, sY: 168, rot: -0.22 }, // eastern ridge
  { x: 570,  y: 730, amp: 0.62, sX: 172, sY: 134, rot:  0.65 }, // southern hill
  { x: 1170, y: 185, amp: 0.50, sX: 148, sY: 120, rot: -0.52 }, // NE summit
  { x:  90,  y: 595, amp: 0.42, sX: 120, sY: 146, rot:  0.12 }, // western knoll
  { x: 720,  y: 520, amp: 0.32, sX:  98, sY: 108, rot: -0.35 }, // centre saddle
];

// 20 elevation bands → dense packing like a real topo map
const LEVELS = Array.from({ length: 20 }, (_, i) => 0.74 - i * 0.034);

// Terrain height: sum of anisotropic Gaussians + organic noise
function evalH(x: number, y: number): number {
  let v = 0;
  for (const p of PEAKS) {
    const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
    const dx = x - p.x, dy = y - p.y;
    const rx = dx * cos + dy * sin;
    const ry = -dx * sin + dy * cos;
    v += p.amp * Math.exp(
      -rx * rx / (2 * p.sX * p.sX)
      -ry * ry / (2 * p.sY * p.sY),
    );
  }
  // Beating-sine noise — irregular organic irregularity
  v += 0.048 * Math.sin(x * 0.0188 + y * 0.0134)
              * Math.cos(x * 0.0312 - y * 0.0207);
  v += 0.022 * Math.sin(x * 0.0071 - y * 0.0415 + 1.3);
  return v;
}

// Ray-cast from peak centre outward at each angle; binary-search to find isoline radius.
function traceContour(
  cx: number,
  cy: number,
  elev: number,
  n = 56,
): [number, number][] | null {
  if (evalH(cx, cy) <= elev) return null; // this peak is below the target elevation
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 2 * Math.PI;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    let lo = 0, hi = 1100;
    for (let k = 0; k < 32; k++) {
      const m = (lo + hi) * 0.5;
      evalH(cx + m * cosA, cy + m * sinA) > elev ? (lo = m) : (hi = m);
    }
    const r = (lo + hi) * 0.5;
    if (r < 4 || r > 1050) continue;
    pts.push([cx + r * cosA, cy + r * sinA]);
  }
  return pts.length >= 8 ? pts : null;
}

const f = (n: number) => n.toFixed(1);

// Catmull-Rom → cubic bezier; tension t controls smoothness (0.16 = smooth)
function toPath(pts: [number, number][]): string {
  const n = pts.length, t = 0.16;
  // pts is guaranteed non-empty by traceContour (>= 8 elements) — safe to assert
  const p0 = pts[0]!;
  let d = `M${f(p0[0])},${f(p0[1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[(i + n - 1) % n]!;
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % n]!;
    const [x3, y3] = pts[(i + 2) % n]!;
    d += ` C${f(x1 + (x2 - x0) * t)},${f(y1 + (y2 - y0) * t)}`
       + ` ${f(x2 - (x3 - x1) * t)},${f(y2 - (y3 - y1) * t)}`
       + ` ${f(x2)},${f(y2)}`;
  }
  return d + "Z";
}

// Pre-compute all contour paths at module load (pure constants — runs once, ~8 ms)
const CONTOURS: { d: string; elev: number; seq: number }[] = (() => {
  const out: { d: string; elev: number; seq: number }[] = [];
  let seq = 0;
  for (const peak of PEAKS) {
    for (const elev of LEVELS) {
      const pts = traceContour(peak.x, peak.y, elev);
      if (pts) out.push({ d: toPath(pts), elev, seq: seq++ });
    }
  }
  return out;
})();

export function MarketingTopoBackground({
  purpleAccent = true,
}: {
  purpleAccent?: boolean;
}) {
  // Nothing reactive — CONTOURS are constant. useMemo just keeps the render clean.
  const contours = useMemo(() => CONTOURS, []);

  return (
    <svg
      viewBox="0 0 1440 960"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <defs>
        <clipPath id="topo-bounds">
          <rect x="0" y="0" width="1440" height="960" />
        </clipPath>
        {/* Subtle fade toward bottom so hero content stays readable */}
        <linearGradient id="topo-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="70%"  stopColor="transparent" />
          <stop offset="100%" stopColor="var(--cds-background)" />
        </linearGradient>
      </defs>

      <g clipPath="url(#topo-bounds)">
        {contours.map((c) => {
          // Inner (high elevation) contours are slightly more visible
          const base = c.elev > 0.58 ? 0.22 : c.elev > 0.40 ? 0.16 : 0.11;
          // Every 6th line gets a purple accent
          const isAccent = purpleAccent && c.seq % 6 === 0;
          return (
            <path
              key={c.seq}
              d={c.d}
              fill="none"
              stroke={
                isAccent
                  ? `rgba(138,63,252,${(base * 1.75).toFixed(2)})`
                  : `rgba(255,255,255,${base})`
              }
              strokeWidth={isAccent ? "1.0" : "0.65"}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Overlay gradient to fade bottom */}
        <rect x="0" y="0" width="1440" height="960" fill="url(#topo-fade)" />
      </g>
    </svg>
  );
}
