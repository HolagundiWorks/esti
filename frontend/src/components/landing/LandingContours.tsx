import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Landing background — topographic contour rings stacked in 3D elevation.
 * Scroll raises the mountain (translateZ); viewing angle stays isometric so
 * the terrain never collapses to a flat profile.
 */
const RINGS = 15;
const CX = 500;
const CY = 620;
const STEPS = 120;

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
      const scrollRoot = document.documentElement;
      const scrollY = window.scrollY || scrollRoot.scrollTop || 0;
      // Slower rise — full elevation after ~2.5 screens.
      const depth = Math.min(1, Math.max(0, scrollY / (vh * 2.5)));
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
    <div
      ref={ref}
      className="esti-lp-contours"
      aria-hidden
      style={{ "--lp-rings": RINGS } as CSSProperties}
    >
      <div className="esti-lp-contours__terrain">
        {Array.from({ length: RINGS }, (_, i) => {
          const k = i + 1;
          return (
            <svg
              key={k}
              className="esti-lp-contours__layer"
              style={{ "--i": i } as CSSProperties}
              viewBox="0 0 1000 620"
              preserveAspectRatio="xMidYMax slice"
            >
              <path
                className="esti-lp-contours__ring"
                d={contourPath(k * 44, k * 27, i * 0.35)}
              />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
