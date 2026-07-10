import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Contour background — chaos → clarity.
 * At rest: near-plan (slight tilt so the map reads).
 * On scroll: terrain tips into a hill elevation — rings stack in Z so depth
 * is unmistakable.
 */
const RINGS = 18;
const CX = 500;
const CY = 520;
const STEPS = 96;

function contourPath(rx: number, ry: number, seed: number): string {
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const wobble =
      1 +
      0.14 * Math.sin(3 * t + 0.6 + seed) +
      0.08 * Math.sin(5 * t + 2.1 - seed) +
      0.05 * Math.sin(8 * t + 4.2) +
      0.035 * Math.sin(2 * t + 1.2 + seed * 0.5);
    const x = CX + rx * wobble * Math.cos(t);
    const y = CY + ry * wobble * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Prefer window scroll — stage is not the scroll container on marketing. */
function readScrollY(): number {
  const winY = window.scrollY || document.documentElement.scrollTop || 0;
  if (winY > 0) return winY;

  const stage = document.getElementById("lp2-main");
  if (stage) {
    const style = window.getComputedStyle(stage);
    const canScroll =
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      stage.scrollHeight > stage.clientHeight + 8;
    if (canScroll) return stage.scrollTop;
  }
  return winY;
}

export function LandingContours() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Still show a readable hill when motion is reduced — no animation.
      el.style.setProperty("--lp-depth", "0.55");
      return;
    }

    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      // Floor at 0.12 so the hill is already readable in the hero;
      // full elevation by ~1.2 viewports.
      const raw = Math.min(1, Math.max(0, readScrollY() / (vh * 1.2)));
      const depth = 0.12 + easeOutCubic(raw) * 0.88;
      el.style.setProperty("--lp-depth", depth.toFixed(4));
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };

    update();
    const stage = document.getElementById("lp2-main");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    stage?.addEventListener("scroll", onScroll, { passive: true });
    // Capture scroll from nested containers too.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      stage?.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
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
          // Outer rings first (base of hill); inner rings rise highest.
          const k = i + 1;
          const rx = 40 + k * 28;
          const ry = 22 + k * 16;
          return (
            <svg
              key={k}
              className="esti-lp-contours__layer"
              style={{ "--i": i } as CSSProperties}
              viewBox="0 0 1000 700"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                className="esti-lp-contours__ring"
                d={contourPath(rx, ry, i * 0.4)}
              />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
