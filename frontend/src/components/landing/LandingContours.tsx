import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Fluid contour background — chaos → clarity.
 * Visual hierarchy:
 *   far  — soft, wide, low contrast (atmosphere)
 *   mid  — readable topographic rings
 *   near — strong Radiant Orange crest (focal)
 * Scroll tips plan → elevation across the **full page** (not just mid-fold).
 * Z-stack steps are 3× baseline (see `--lp-step-*` / `--lp-rise-*` in landing.scss).
 */
const FAR_RINGS = 10;
const MID_RINGS = 12;
const NEAR_RINGS = 8;
const CX = 500;
const CY = 480;
const STEPS = 100;
/** Lerp factor per frame — higher = snappier, lower = silkier. */
const DEPTH_SMOOTH = 0.085;

function contourPath(
  rx: number,
  ry: number,
  seed: number,
  fluid = 1,
): string {
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const wobble =
      1 +
      0.16 * fluid * Math.sin(3 * t + 0.6 + seed) +
      0.1 * fluid * Math.sin(5 * t + 2.1 - seed) +
      0.06 * fluid * Math.sin(8 * t + 4.2 + seed * 0.3) +
      0.04 * fluid * Math.sin(2 * t + 1.2 + seed * 0.5) +
      0.025 * fluid * Math.sin(11 * t + seed);
    const x = CX + rx * wobble * Math.cos(t);
    const y = CY + ry * wobble * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

/** Smoothstep — gentler than easeOutCubic so mid-page doesn't plateau early. */
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function getScrollMetrics(): { y: number; max: number } {
  const stage = document.getElementById("lp2-main");
  if (stage) {
    const style = window.getComputedStyle(stage);
    const canScroll =
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      stage.scrollHeight > stage.clientHeight + 8;
    if (canScroll) {
      return {
        y: stage.scrollTop,
        max: Math.max(1, stage.scrollHeight - stage.clientHeight),
      };
    }
  }

  const doc = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(
    doc.scrollHeight,
    body?.scrollHeight ?? 0,
    doc.offsetHeight,
  );
  const clientHeight = window.innerHeight || doc.clientHeight || 1;
  return {
    y: window.scrollY || doc.scrollTop || 0,
    max: Math.max(1, scrollHeight - clientHeight),
  };
}

type Band = "far" | "mid" | "near";

function ContourBand({
  band,
  count,
  rxBase,
  ryBase,
  rxStep,
  ryStep,
  fluid,
}: {
  band: Band;
  count: number;
  rxBase: number;
  ryBase: number;
  rxStep: number;
  ryStep: number;
  fluid: number;
}) {
  return (
    <div className={`esti-lp-contours__band esti-lp-contours__band--${band}`}>
      {Array.from({ length: count }, (_, i) => {
        const k = i + 1;
        return (
          <svg
            key={`${band}-${k}`}
            className="esti-lp-contours__layer"
            style={{ "--i": i, "--band-n": count } as CSSProperties}
            viewBox="0 0 1000 720"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              className="esti-lp-contours__ring"
              d={contourPath(
                rxBase + k * rxStep,
                ryBase + k * ryStep,
                i * 0.45 + (band === "near" ? 1 : band === "mid" ? 0.4 : 0),
                fluid,
              )}
            />
          </svg>
        );
      })}
    </div>
  );
}

export function LandingContours() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.style.setProperty("--lp-depth", "0.45");
      el.style.setProperty("--lp-flow", "0");
      return;
    }

    let raf = 0;
    let running = true;
    let currentDepth = 0.08;
    let currentFlow = 0;
    let targetDepth = 0.08;
    let targetFlow = 0;
    let needsTick = true;

    const readTargets = () => {
      const { y, max } = getScrollMetrics();
      // Progress 0 → 1 across the full scrollable page (footer included).
      const raw = Math.min(1, Math.max(0, y / max));
      const eased = smoothstep(raw);
      targetDepth = 0.08 + eased * 0.92;
      targetFlow = eased * 0.45;
      needsTick = true;
    };

    const tick = () => {
      if (!running) return;
      raf = 0;

      const dDepth = targetDepth - currentDepth;
      const dFlow = targetFlow - currentFlow;
      if (Math.abs(dDepth) > 0.0004 || Math.abs(dFlow) > 0.0004) {
        currentDepth += dDepth * DEPTH_SMOOTH;
        currentFlow += dFlow * DEPTH_SMOOTH;
        el.style.setProperty("--lp-depth", currentDepth.toFixed(4));
        el.style.setProperty("--lp-flow", currentFlow.toFixed(4));
        needsTick = true;
      } else {
        currentDepth = targetDepth;
        currentFlow = targetFlow;
        el.style.setProperty("--lp-depth", currentDepth.toFixed(4));
        el.style.setProperty("--lp-flow", currentFlow.toFixed(4));
        needsTick = false;
      }

      if (needsTick) raf = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      readTargets();
      if (!raf) raf = window.requestAnimationFrame(tick);
    };

    readTargets();
    currentDepth = targetDepth;
    currentFlow = targetFlow;
    el.style.setProperty("--lp-depth", currentDepth.toFixed(4));
    el.style.setProperty("--lp-flow", currentFlow.toFixed(4));

    const stage = document.getElementById("lp2-main");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    stage?.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    // Recalc when content height changes (images / fonts).
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => onScroll())
        : null;
    if (stage) ro?.observe(stage);
    ro?.observe(document.documentElement);

    return () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      stage?.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      ro?.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="esti-lp-contours"
      aria-hidden
      style={
        {
          "--lp-rings-far": FAR_RINGS,
          "--lp-rings-mid": MID_RINGS,
          "--lp-rings-near": NEAR_RINGS,
        } as CSSProperties
      }
    >
      <div className="esti-lp-contours__wash" />
      <div className="esti-lp-contours__terrain">
        <ContourBand
          band="far"
          count={FAR_RINGS}
          rxBase={80}
          ryBase={48}
          rxStep={38}
          ryStep={22}
          fluid={1.15}
        />
        <ContourBand
          band="mid"
          count={MID_RINGS}
          rxBase={36}
          ryBase={22}
          rxStep={26}
          ryStep={15}
          fluid={1}
        />
        <ContourBand
          band="near"
          count={NEAR_RINGS}
          rxBase={18}
          ryBase={12}
          rxStep={18}
          ryStep={11}
          fluid={0.85}
        />
      </div>
    </div>
  );
}
