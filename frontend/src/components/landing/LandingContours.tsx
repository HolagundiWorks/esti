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
                <ellipse
                  key={k}
                  className="esti-lp-contours__ring"
                  cx={500}
                  cy={620}
                  rx={k * 42}
                  ry={k * 26}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
