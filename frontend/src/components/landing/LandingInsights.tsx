import { Link } from "react-router-dom";
import { formatPostDate, listPosts } from "../../lib/blog.js";

const UPCOMING = [
  "Preventing scope creep through revision intelligence",
  "The future of architecture operations",
  "Better client approval workflow for architecture teams",
];

/** Homepage architecture insights grid — latest articles + upcoming roadmap. */
export function LandingInsights() {
  const latest = listPosts().slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <div className="esti-lp-grid esti-lp-insights-grid" aria-labelledby="insights-title">
      <div className="esti-lp-tile esti-lp-tile--2x1 esti-lp-insights-intro">
        <div className="esti-lp-tile__hdr">
          <span className="esti-lp-dot esti-lp-dot--yellow" aria-hidden>●</span>
          <span className="esti-lp-tile__hdr-label">03 / Learn The Rhythm</span>
          <span className="esti-lp-tile__hdr-meta">Field notes</span>
        </div>
        <div className="esti-lp-insights-intro__body">
          <p className="esti-lp-section-label">How firms use the operating record</p>
          <h3 id="insights-title" className="esti-lp-feature-title">
            Read the situations AORMS is designed to catch before they become expensive habits.
          </h3>
          <Link to="/blog" className="esti-lp-inline-link">All articles →</Link>
        </div>
      </div>

      {latest.map((p) => (
        <Link key={p.slug} to={`/blog/${p.slug}`} className="esti-lp-tile esti-lp-insight-card">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--white" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">
              {formatPostDate(p.date)} · {p.readingMinutes} min
            </span>
          </div>
          <div className="esti-lp-insight-card__body">
            <h3>{p.title}</h3>
          </div>
        </Link>
      ))}

      <div className="esti-lp-tile esti-lp-tile--2x1 esti-lp-insights-upcoming">
        <div className="esti-lp-tile__hdr">
          <span className="esti-lp-dot esti-lp-dot--white" aria-hidden>●</span>
          <span className="esti-lp-tile__hdr-label">Upcoming insights</span>
        </div>
        <ul>
          {UPCOMING.map((t) => (
            <li key={t}><span aria-hidden>→</span>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
