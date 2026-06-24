import { Link } from "react-router-dom";
import { formatPostDate, listPosts } from "../../lib/blog.js";

const UPCOMING = [
  "Preventing scope creep through revision intelligence",
  "The future of architecture operations",
  "Better client approval workflow for architecture teams",
];

/** Homepage "Architecture insights" band — latest articles + upcoming roadmap. */
export function LandingInsights() {
  const latest = listPosts().slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <section className="esti-insights" aria-labelledby="insights-title">
      <div className="esti-insights__head">
        <h2 id="insights-title">Architecture insights</h2>
        <Link to="/blog">All articles →</Link>
      </div>

      <div className="esti-insights__grid">
        {latest.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="esti-insights__card">
            <div className="esti-insights__meta">
              {formatPostDate(p.date)} · {p.readingMinutes} min read
            </div>
            <h3>{p.title}</h3>
          </Link>
        ))}
      </div>

      <div className="esti-insights__upcoming">
        <p>Upcoming insights</p>
        <ul>
          {UPCOMING.map((t) => (
            <li key={t}><span aria-hidden>→</span> {t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
