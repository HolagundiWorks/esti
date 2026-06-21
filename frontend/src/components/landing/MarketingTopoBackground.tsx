/**
 * MarketingTopoBackground
 *
 * SVG background for the hero and pillars sections.
 * Aesthetic: radial glow + dot grid + sweeping terrain arcs (alternating
 * purple / teal) + nested closed contour loops around a focal peak +
 * accent dots.  All purely declarative SVG — zero runtime computation,
 * zero CSS classes, zero custom animation.
 *
 * purpleAccent=false shows arcs only (teal-dominant), used on the
 * pillars section so it reads differently from the hero.
 */

const PURPLE  = "rgba(138,63,252,";
const TEAL    = "rgba(0,125,121,";
const BLUE    = "rgba(15,98,254,";

// 8 sweeping terrain arcs — left edge to right edge, rising gently
const ARCS = [
  "M-100,195 C210,72  460,100 672,188 C908,282 1112,148 1540,100",
  "M-110,278 C208,148 466,164 686,256 C930,360 1134,248 1540,196",
  "M-120,368 C215,232 496,240 728,336 C966,432 1174,338 1540,290",
  "M-130,458 C228,316 528,314 778,418 C1020,520 1224,454 1540,410",
  "M-140,552 C235,406 552,408 818,502 C1062,598 1264,566 1540,524",
  "M-150,646 C228,516 566,524 848,598 C1096,672 1276,676 1540,640",
  "M-155,738 C230,628 572,644 864,696 C1124,748 1296,776 1540,758",
  "M-155,830 C218,742 564,754 876,778 C1148,802 1304,866 1540,870",
] as const;

// Closed contour loops around the focal peak at ~(876, 330)
// Listed outer → inner so inner loops paint on top
const LOOPS: { d: string; strokeOpacity: number; strokeWidth: number }[] = [
  {
    d:  "M978,62 C1096,30 1250,88 1274,218 C1300,368 1208,478 1062,470 "
      + "C912,462 832,370 850,218 C862,120 892,82 978,62 Z",
    strokeOpacity: 0.22,
    strokeWidth: 0.9,
  },
  {
    d:  "M916,104 C1006,74 1124,110 1150,206 C1178,312 1102,402 992,396 "
      + "C880,390 818,316 834,214 C844,150 864,118 916,104 Z",
    strokeOpacity: 0.30,
    strokeWidth: 1.0,
  },
  {
    d:  "M858,148 C924,120 1014,142 1038,202 C1064,272 1010,330 932,324 "
      + "C854,318 806,258 818,196 C826,166 838,154 858,148 Z",
    strokeOpacity: 0.40,
    strokeWidth: 1.0,
  },
  {
    d:  "M872,198 C916,182 966,196 982,234 C1000,278 972,316 920,312 "
      + "C868,308 840,272 848,230 C852,210 858,200 872,198 Z",
    strokeOpacity: 0.52,
    strokeWidth: 0.95,
  },
  {
    d:  "M880,240 C906,230 938,240 950,264 C964,292 946,318 912,316 "
      + "C878,314 858,292 862,264 C864,248 870,242 880,240 Z",
    strokeOpacity: 0.64,
    strokeWidth: 0.9,
  },
  {
    d:  "M884,272 C900,264 920,272 928,292 C936,314 922,332 898,330 "
      + "C874,328 860,310 864,288 C866,278 874,272 884,272 Z",
    strokeOpacity: 0.76,
    strokeWidth: 0.85,
  },
];

export function MarketingTopoBackground({
  purpleAccent = true,
}: {
  purpleAccent?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.82,
      }}
    >
      <defs>
        {/* Radial glow — blue core, purple mid, fades out */}
        <radialGradient id="topo-glow" cx="62%" cy="34%" r="68%">
          <stop offset="0%"   stopColor="#0F62FE" stopOpacity="0.16" />
          <stop offset="42%"  stopColor="#8A3FFC" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0"    />
        </radialGradient>

        {/* Subtle line-grid — gives a technical / dashboard grid feel */}
        <pattern id="topo-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M48 0 L0 0 0 48"
            stroke="#ffffff"
            strokeOpacity="0.032"
            strokeWidth="1"
            fill="none"
          />
        </pattern>

        {/* Soft glow filter on the contour layer */}
        <filter id="topo-blur" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id="topo-bounds">
          <rect x="0" y="0" width="1440" height="900" />
        </clipPath>
      </defs>

      {/* 1 — Radial glow overlay */}
      <rect width="1440" height="900" fill="url(#topo-glow)" />

      {/* 2 — Dot-line grid */}
      <rect width="1440" height="900" fill="url(#topo-grid)" />

      {/* 3 — Contour layer (filtered) */}
      <g filter="url(#topo-blur)" clipPath="url(#topo-bounds)">

        {/* Sweeping terrain arcs — alternate purple / teal */}
        {ARCS.map((d, i) => (
          <path
            key={`arc-${i}`}
            d={d}
            stroke={
              i % 2 === 0
                ? `${PURPLE}0.38)`
                : `${TEAL}0.34)`
            }
            strokeWidth="1.15"
            fill="none"
          />
        ))}

        {/* Closed contour loops — purple (only when purpleAccent=true) */}
        {purpleAccent && LOOPS.map((lp, i) => (
          <path
            key={`loop-${i}`}
            d={lp.d}
            stroke={`${PURPLE}${lp.strokeOpacity})`}
            strokeWidth={lp.strokeWidth}
            fill="none"
          />
        ))}

        {/* Glowing accent dots at terrain peaks (shown only with accent) */}
        {purpleAccent && (
          <>
            <circle cx="898" cy="316" r="3.0" fill={`${PURPLE}0.72)`} />
            <circle cx="962" cy="244" r="2.5" fill={`${BLUE}0.66)`}   />
            <circle cx="1048" cy="358" r="2.5" fill={`${TEAL}0.60)`}  />
            <circle cx="714"  cy="222" r="2.0" fill={`${PURPLE}0.55)`} />
          </>
        )}
      </g>

      {/* 4 — Bottom fade so hero text reads clearly */}
      <defs>
        <linearGradient id="topo-bottom-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="65%" stopColor="transparent"            />
          <stop offset="100%" stopColor="var(--cds-background)" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#topo-bottom-fade)" />
    </svg>
  );
}
