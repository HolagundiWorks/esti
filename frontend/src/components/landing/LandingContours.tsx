import { useEffect, useRef } from "react";

/**
 * Landing background — faint Radiant-Orange topographic contour rings.
 *
 * On load the rings read as a flat **plan** (top-down site plan) anchored to the
 * bottom of the first screen. As you scroll, a scroll-linked `--lp-depth` (0→1)
 * tilts the plane into a receding **perspective** ground plane — "you've reached
 * the depth of AORMS." Purely decorative (aria-hidden), sits behind all content.
 * Colour + geometry live in landing.scss; this only drives the scroll variable.
 */
const RINGS = 15;
const CX = 500; // contour centre — bottom-centre of the viewBox
const CY = 620;
const STEPS = 120;

/** One organic contour loop (mean radii rx/ry) — a fixed multi-frequency wobble
 *  makes it wavy topographic, not a perfect ellipse. `seed` drifts the phase per
 *  ring so nested loops aren't machine-parallel. */
function contourPath(rx: number, ry: number, seed: number): string {
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const wobble =
      1 +
      0.12 * Math.sin(3 * t + 0.6 + seed) +
      0.07 * Math.sin(5 * t + 2.1 - seed) +
      0.045 * Math.sin(8 * t + 4.2) +
      0.03 * Math.sin(2 * t + 1.2 + seed * 0.5);
    const x = CX + rx * wobble * Math.cos(t);
    const y = CY + ry * wobble * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

export function LandingContours() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      // Full depth after ~1.4 screens of scroll; clamp 0…1.
      const depth = Math.min(1, Math.max(0, window.scrollY / (vh * 1.4)));
      el.style.setProperty("--lp-depth", depth.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="esti-lp-contours" aria-hidden>
      <div className="esti-lp-contours__plane">
        <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMax slice">
          <g className="esti-lp-contours__rings">
            {Array.from({ length: RINGS }, (_, i) => {
              const k = i + 1;
              return (
                <path
                  key={k}
                  className="esti-lp-contours__ring"
                  d={contourPath(k * 44, k * 27, i * 0.35)}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
