/**
 * Static preview of the Dashboard "Quality intelligence" zone for the marketing landing.
 * Animates metrics, radar profile and revision meter when scrolled into view.
 */
import { useEffect, useRef, useState } from "react";
import {
  interpolateRevisionSnapshot,
  interpolateTechnicalSnapshot,
} from "../lib/quality-intelligence.js";
import {
  QUALITY_INTELLIGENCE_DEMO,
  QualityIntelligenceTiles,
} from "./QualityIntelligenceTiles.js";

const ANIM_MS = 2000;
/** Carbon Charts cannot handle per-frame data updates — animate in discrete steps. */
const CHART_STEPS = 12;

function useQiAnimProgress(durationMs: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / durationMs);
      const step = Math.round(t * CHART_STEPS) / CHART_STEPS;
      setProgress((prev) => (step !== prev ? step : prev));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      raf = requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          start();
          obs.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [durationMs]);

  return { ref, progress, live: progress > 0 };
}

export function QualityIntelligencePreview() {
  const { ref, progress, live } = useQiAnimProgress(ANIM_MS);
  const revision = interpolateRevisionSnapshot(QUALITY_INTELLIGENCE_DEMO.revision, progress);
  const technical = interpolateTechnicalSnapshot(QUALITY_INTELLIGENCE_DEMO.technical, progress);

  return (
    <div
      ref={ref}
      className={`esti-lp-qi-preview${live ? " esti-lp-qi-preview--live" : ""}${
        progress >= 1 ? " esti-lp-qi-preview--done" : ""
      }`}
      aria-hidden
    >
      <QualityIntelligenceTiles
        className="esti-qi-tiles--landing"
        revision={revision}
        technical={technical}
        chartAnimations={false}
        animSource={{
          revision: QUALITY_INTELLIGENCE_DEMO.revision,
          technical: QUALITY_INTELLIGENCE_DEMO.technical,
        }}
      />
    </div>
  );
}
