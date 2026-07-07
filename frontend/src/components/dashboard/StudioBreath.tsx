/**
 * Studio Intelligence ambient background — faint **topographic contour** lines
 * (organic wavy loops, not circles) whose centre sits at the bottom-right; they
 * fan up-left into the screen and breathe at a slow **resonant pace**
 * (~5.5 breaths/min, an ~11s inhale → hold → exhale → rest cycle). A passive
 * breathing pacer: let the eyes rest and the breath follow the expansion.
 *
 * Purely decorative (aria-hidden), behind the dashboard content. Colour, timing
 * and the bottom-right anchoring live in glass.scss; honours prefers-reduced-motion.
 */
const RINGS = 11;
const CENTER = 300; // viewBox centre = contour centre (anchored to the corner in CSS)
const STEPS = 96;

/** One organic contour loop of mean radius `baseR` — a fixed multi-frequency
 *  wobble makes it wavy (topographic), not a perfect circle. `seed` drifts the
 *  phase per ring so nested loops aren't machine-parallel. */
function contourPath(baseR: number, seed: number): string {
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const wobble =
      1 +
      0.12 * Math.sin(3 * t + 0.6 + seed) +
      0.07 * Math.sin(5 * t + 2.1 - seed) +
      0.045 * Math.sin(8 * t + 4.2) +
      0.03 * Math.sin(2 * t + 1.2 + seed * 0.5);
    const r = baseR * wobble;
    const x = CENTER + r * Math.cos(t);
    const y = CENTER + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

export function StudioBreath() {
  return (
    <div className="esti-si-breath" aria-hidden>
      <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet">
        <g className="esti-si-breath__rings">
          {Array.from({ length: RINGS }, (_, i) => (
            <path
              key={i}
              className="esti-si-breath__ring"
              d={contourPath(26 + i * 28, i * 0.35)}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
