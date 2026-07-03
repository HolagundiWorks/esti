/**
 * Ambient reel tile — a square marketing reel (SVG/CSS-styled animation under
 * /media) looping inside an operational-grid tile. Decorative media: it
 * autoplays, loops, exposes no playback controls and takes no pointer/keyboard
 * focus. The iframe is same-origin and lazy, so it loads only near the viewport.
 */
export function ReelLoopTile({ slug, label, meta }: {
  slug: string;
  label: string;
  meta?: string;
}) {
  return (
    <div className="esti-lp-tile esti-lp-tile--2x2 esti-lp-tile--media">
      <div className="esti-lp-tile__hdr">
        <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
        <span className="esti-lp-tile__hdr-label">{label}</span>
        {meta && <span className="esti-lp-tile__hdr-meta">{meta}</span>}
      </div>
      <div className="esti-lp-tile__media">
        <iframe
          className="esti-lp-tile__media-frame"
          src={`/media/${slug}.html`}
          title={label}
          loading="lazy"
          tabIndex={-1}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
