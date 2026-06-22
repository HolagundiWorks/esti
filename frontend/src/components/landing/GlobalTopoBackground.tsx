/**
 * GlobalTopoBackground
 *
 * Absolute-positioned SVG spanning the full landing shell.
 * Mimics civil engineering topographic survey maps:
 *   – Gaussian terrain model (8 peaks + 3 wide sweep peaks)
 *   – Distorted-ellipse isohypses computed from terrain math (no random())
 *   – White-only strokes; varying width (0.4–0.9px) and opacity (0.04–0.20)
 *   – Index contours every 5th level (thicker), survey-map convention
 *   – All paths pre-computed at module load — zero per-render cost
 *
 * viewBox 1440×4000 covers the full page with preserveAspectRatio="none"
 * so it fills whatever height the shell grows to.
 */

const W = 1440;
const H = 4000;

function f(n: number) { return Math.round(n * 10) / 10; }

interface Peak {
  cx: number;
  cy: number;
  sX: number;
  sY: number;
  rot: number;
  wob: number;
  K: number;
  phase: number;
  n: number;
}

// ── Localized peaks (nested closed-loop contours) ────────────────────────────

// TOP SECTION — 40% area (top-left cluster per brief)
// MIDDLE SECTION — 15% center + 25% bottom-right
// BOTTOM SECTION — 20% edges

const PEAKS: Peak[] = [
  // Top-left primary
  { cx: 285, cy: 310, sX: 238, sY: 192, rot:  0.26, wob: 0.13, K: 5, phase: 0.40, n: 20 },
  // Top-left secondary
  { cx: 468, cy: 515, sX: 185, sY: 155, rot: -0.19, wob: 0.10, K: 6, phase: 1.20, n: 18 },
  // Top-left tertiary (lower)
  { cx: 128, cy: 545, sX: 146, sY: 165, rot:  0.38, wob: 0.09, K: 4, phase: 2.00, n: 16 },
  // Top-right edge
  { cx: 1265, cy: 208, sX: 136, sY: 113, rot: -0.29, wob: 0.07, K: 5, phase: 0.80, n: 14 },
  // Middle right (bottom-right cluster)
  { cx: 1128, cy: 1645, sX: 198, sY: 156, rot: -0.44, wob: 0.11, K: 5, phase: 1.80, n: 18 },
  // Middle center
  { cx:  742, cy: 1915, sX: 160, sY: 128, rot:  0.14, wob: 0.09, K: 7, phase: 0.60, n: 16 },
  // Bottom left
  { cx:  218, cy: 3085, sX: 176, sY: 146, rot:  0.32, wob: 0.10, K: 5, phase: 2.40, n: 18 },
  // Bottom right
  { cx: 1308, cy: 2902, sX: 153, sY: 126, rot: -0.22, wob: 0.08, K: 6, phase: 1.50, n: 15 },
];

// ── Wide sweep peaks (produce arcs spanning full viewport width) ──────────────

const SWEEP_PEAKS: Peak[] = [
  // Top hemisphere sweep
  { cx:  160, cy: -255, sX: 2200, sY: 700, rot:  0.065, wob: 0.018, K: 3, phase: 0.30, n: 12 },
  // Bottom hemisphere sweep
  { cx: 1280, cy: 4255, sX: 2000, sY: 645, rot: -0.055, wob: 0.015, K: 3, phase: 1.00, n: 12 },
  // Mid-page lateral sweep
  { cx: -100, cy: 2105, sX: 1800, sY: 545, rot:  0.040, wob: 0.012, K: 4, phase: 0.70, n: 10 },
];

// ── Catmull-Rom → cubic bezier helper ─────────────────────────────────────────

function catmullRom(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return "";
  const s: string[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    if (i === 0) s.push(`M${f(p1[0])},${f(p1[1])}`);
    s.push(`C${f(cp1x)},${f(cp1y)} ${f(cp2x)},${f(cp2y)} ${f(p2[0])},${f(p2[1])}`);
  }
  s.push("Z");
  return s.join(" ");
}

// ── Contour path generation ────────────────────────────────────────────────────

interface ContourPath { d: string; sw: number; op: number; }

function buildContours(p: Peak, isSweep: boolean): ContourPath[] {
  const result: ContourPath[] = [];
  const N_PTS = isSweep ? 48 : 72;
  const MARGIN = 150;

  for (let li = 0; li < p.n; li++) {
    // Log-linear level spacing: innermost (tight rings) → outermost (wide rings)
    const t = (li + 0.5) / p.n;
    const level = Math.exp(-t * 3.0);  // 0.956 → 0.044
    const rBase = Math.sqrt(-2 * Math.log(level));
    const rX = rBase * p.sX;
    const rY = rBase * p.sY;

    // Generate distorted-ellipse points
    const pts: [number, number][] = [];
    for (let i = 0; i < N_PTS; i++) {
      const theta = (2 * Math.PI * i) / N_PTS;
      const wob = 1 + p.wob * Math.sin(p.K * theta + p.phase);
      const ex = rX * wob * Math.cos(theta);
      const ey = rY * wob * Math.sin(theta);
      const rx = ex * Math.cos(p.rot) - ey * Math.sin(p.rot);
      const ry = ex * Math.sin(p.rot) + ey * Math.cos(p.rot);
      pts.push([p.cx + rx, p.cy + ry]);
    }

    // Cull paths entirely outside the canvas (with margin)
    const inView = pts.some(
      ([x, y]) => x > -MARGIN && x < W + MARGIN && y > -MARGIN && y < H + MARGIN,
    );
    if (!inView) continue;

    // Survey-map stroke convention —
    //   index contours (every 5th level): thicker + more opaque
    //   intermediate contours: standard
    //   inner rings slightly more visible (steeper terrain = more prominent summit)
    const isIndex = li % 5 === 0;
    const isMed   = !isIndex && (li % 5 === 2 || li % 5 === 4);
    const inner   = 1 - li / p.n;  // 1.0 = innermost, 0 = outermost

    const baseOp = isSweep ? 0.038 : 0.055;
    const op = isIndex
      ? baseOp + 0.115 + inner * 0.045   // 0.17 – 0.21
      : isMed
        ? baseOp + 0.042 + inner * 0.025 // 0.10 – 0.12
        : baseOp + inner * 0.018;         // 0.055 – 0.073

    const sw = isIndex
      ? (isSweep ? 0.75 : 0.82)
      : isMed
        ? (isSweep ? 0.48 : 0.53)
        : (isSweep ? 0.33 : 0.40);

    result.push({ d: catmullRom(pts), sw, op });
  }

  return result;
}

// Pre-compute all contour paths once at module load (zero per-render cost).
const ALL_PATHS: ContourPath[] = [
  ...PEAKS.flatMap((p) => buildContours(p, false)),
  ...SWEEP_PEAKS.flatMap((p) => buildContours(p, true)),
];

// ── React component ────────────────────────────────────────────────────────────

export function GlobalTopoBackground() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <clipPath id="gtb-clip">
        <rect x="0" y="0" width={W} height={H} />
      </clipPath>
      <g clipPath="url(#gtb-clip)">
        {ALL_PATHS.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={`rgba(255,255,255,${p.op.toFixed(3)})`}
            strokeWidth={p.sw}
            fill="none"
          />
        ))}
      </g>
    </svg>
  );
}
