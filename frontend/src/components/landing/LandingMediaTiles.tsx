import { useEffect, useRef, useState } from "react";

/**
 * "In Motion" media section — the AORMS marketing media (animated reels +
 * the live ESTI Pulse widget) presented in the landing page's operational
 * tile grid. Reels are the self-contained pages under /media (same-origin
 * iframes, loaded only on click); the Pulse widget is rendered natively so
 * the section carries motion without loading any reel runtime.
 */

type Dot = "green" | "yellow" | "red" | "white";

function StatusDot({ color }: { color: Dot }) {
  return <span className={`esti-lp-dot esti-lp-dot--${color}`} aria-hidden>●</span>;
}

function TileHead({ label, dot, meta }: { label: string; dot: Dot; meta?: string }) {
  return (
    <div className="esti-lp-tile__hdr">
      <StatusDot color={dot} />
      <span className="esti-lp-tile__hdr-label">{label}</span>
      {meta && <span className="esti-lp-tile__hdr-meta">{meta}</span>}
    </div>
  );
}

// ── Live ESTI Pulse widget (native port of the landing animation media) ─────

const PULSE_R = 86;
const PULSE_CIRC = 2 * Math.PI * PULSE_R;
const PULSE_TARGET = 62;
const PULSE_LOOP = 6.2; // seconds per scan loop

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function PulseWidget() {
  const fillRef = useRef<SVGCircleElement>(null);
  const scanRef = useRef<SVGCircleElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    const scan = scanRef.current;
    const score = scoreRef.current;
    if (!fill || !scan || !score) return;

    const scanArc = PULSE_CIRC * 0.1;
    fill.style.strokeDasharray = String(PULSE_CIRC);
    scan.style.strokeDasharray = `${scanArc} ${PULSE_CIRC - scanArc}`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fill.style.strokeDashoffset = String(PULSE_CIRC * (1 - PULSE_TARGET / 100));
      scan.style.opacity = "0";
      score.textContent = String(PULSE_TARGET);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    const frame = (ts: number) => {
      if (start === null) start = ts;
      const t = ((ts - start) / 1000) % PULSE_LOOP;

      // Ring sweeps in over 1.8s, then holds with a gentle live fluctuation.
      const frac = t < 1.8
        ? easeOutCubic(t / 1.8) * (PULSE_TARGET / 100)
        : PULSE_TARGET / 100 + Math.sin((t - 1.8) * 1.6) * 0.006;
      fill.style.strokeDashoffset = String(PULSE_CIRC * (1 - frac));

      score.textContent = String(t < 1.8 ? Math.round(easeOutCubic(t / 1.8) * PULSE_TARGET) : PULSE_TARGET);

      // Travelling scan highlight, brightest mid-travel.
      const travel = t / PULSE_LOOP;
      scan.style.strokeDashoffset = String(PULSE_CIRC * (1 - travel));
      scan.style.opacity = (0.15 + 0.6 * Math.sin(travel * Math.PI)).toFixed(3);

      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="esti-lp-pulse" role="img" aria-label={`ESTI Pulse score: ${PULSE_TARGET} out of 100`}>
      <div className="esti-lp-pulse__halo" />
      <svg className="esti-lp-pulse__ring" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="esti-lp-pulse-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="esti-lp-pulse__stop-deep" />
            <stop offset="100%" className="esti-lp-pulse__stop-soft" />
          </linearGradient>
        </defs>
        <circle className="esti-lp-pulse__track" cx="100" cy="100" r={PULSE_R} />
        <circle ref={fillRef} className="esti-lp-pulse__fill" cx="100" cy="100" r={PULSE_R} />
        <circle ref={scanRef} className="esti-lp-pulse__scan" cx="100" cy="100" r={PULSE_R} />
      </svg>
      <p className="esti-lp-pulse__label"><span className="esti-lp-pulse__beat" />ESTI Pulse</p>
      <div className="esti-lp-pulse__core">
        <p ref={scoreRef} className="esti-lp-pulse__score">0</p>
        <p className="esti-lp-pulse__max">/ 100 · this week</p>
      </div>
      <div className="esti-lp-pulse__ticks" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ animationDelay: `${(i * 0.14).toFixed(2)}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Click-to-play reel tile ─────────────────────────────────────────────────

const REELS = [
  {
    slug: "esti-pulse",
    header: "Office pulse",
    meta: "0:27",
    hook: "This number isn't an AI guess — it's computed from the live office record.",
  },
  {
    slug: "mom-revision",
    header: "Minutes → revisions",
    meta: "0:33",
    hook: "ESTI turns issued meeting minutes into the client's revision requests.",
  },
  {
    slug: "task-prioritization",
    header: "Everything's urgent",
    meta: "0:37",
    hook: "Every site scored, every morning a plan — do this, in this order.",
  },
  {
    slug: "gst-invoice",
    header: "GST invoice",
    meta: "0:31",
    hook: "From “we should bill them” to a compliant PDF before the chai cools.",
  },
] as const;

function ReelTile({ slug, header, meta, hook }: (typeof REELS)[number]) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="esti-lp-tile esti-lp-tile--media">
      <TileHead label={header} dot={playing ? "green" : "white"} meta={meta} />
      <div className="esti-lp-tile__media">
        {playing ? (
          <iframe
            className="esti-lp-tile__media-frame"
            src={`/media/${slug}.html`}
            title={header}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <button type="button" className="esti-lp-tile__media-poster" onClick={() => setPlaying(true)}>
            <span className="esti-lp-tile__media-play" aria-hidden>▶</span>
            <span className="esti-lp-tile__media-hook">{hook}</span>
            <span className="esti-lp-tile__media-cta">Play the short</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

export function InMotionSection() {
  return (
    <>
      <section className="esti-lp-section-break" aria-label="Watch the office run">
        <div className="esti-lp-section-break__copy">
          <p className="esti-lp-section-break__eyebrow">13 / In Motion</p>
          <h2>Watch the office run</h2>
          <p>
            Thirty-second shorts drawn from the product itself — the pulse score, the
            minutes-to-revision flow, the morning priority list and GST invoicing, animated
            in the same design system the workspace runs on.
          </p>
        </div>
      </section>
      <div className="esti-lp-grid">
        <div className="esti-lp-tile esti-lp-tile--2x2 esti-lp-tile--media">
          <TileHead label="ESTI Pulse" dot="green" meta="LIVE" />
          <div className="esti-lp-tile__media esti-lp-tile__media--pulse">
            <PulseWidget />
          </div>
        </div>
        {REELS.map((r) => <ReelTile key={r.slug} {...r} />)}
      </div>
    </>
  );
}
