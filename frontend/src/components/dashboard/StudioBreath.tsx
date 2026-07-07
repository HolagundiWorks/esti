/**
 * Studio Intelligence ambient background — faint concentric contour rings that
 * breathe at a slow **resonant pace** (~5.5 breaths/min, an ~11s inhale-hold-
 * exhale-rest cycle). It doubles as a passive breathing pacer: rest your eyes on
 * the centre and let your breath follow the expansion/contraction to settle.
 *
 * Purely decorative (aria-hidden), sits behind the dashboard content (the
 * `.esti-glass-dash` isolate layer pins real content to z-index 1). Colour +
 * timing live in glass.scss; honours prefers-reduced-motion.
 */
const RINGS = 9;

export function StudioBreath() {
  return (
    <div className="esti-si-breath" aria-hidden>
      <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet">
        <g className="esti-si-breath__rings">
          {Array.from({ length: RINGS }, (_, i) => (
            <circle key={i} className="esti-si-breath__ring" cx={300} cy={300} r={30 + i * 30} />
          ))}
        </g>
      </svg>
    </div>
  );
}
