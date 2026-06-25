import { Link } from "react-router-dom";
import { formatPostDate, listPosts } from "../../lib/blog.js";

const GROUPS = [
  {
    heading: "Office essays",
    tags: ["Operations", "Practice", "Product", "Team", "Vision", "Story", "Demo", "Design", "Cognition", "Security", "AI"],
    excludeTags: ["Revisions", "Approvals", "Workflow", "Client", "Drawings", "India", "Finance"],
  },
  {
    heading: "Change and approval notes",
    tags: ["Revisions", "Approvals", "Workflow", "Client", "Drawings"],
    excludeTags: [],
  },
  {
    heading: "Indian practice notes",
    tags: ["India", "Finance"],
    excludeTags: ["Revisions", "Approvals", "Workflow", "Client", "Drawings"],
  },
] as const;

function postsFor(tags: readonly string[], excludeTags: readonly string[]) {
  const wanted = new Set(tags);
  const blocked = new Set(excludeTags);
  return listPosts()
    .filter((p) => !p.draft && p.tags.some((tag) => wanted.has(tag)) && !p.tags.some((tag) => blocked.has(tag)))
    .slice(0, 5);
}

/** Homepage practice notes grouped after the product story. */
export function LandingInsights() {
  const groups = GROUPS.map((group) => ({ ...group, posts: postsFor(group.tags, group.excludeTags) }))
    .filter((group) => group.posts.length > 0);
  if (groups.length === 0) return null;

  return (
    <>
      <section className="esti-lp-section-break" aria-labelledby="insights-title">
        <div className="esti-lp-section-break__copy">
          <p className="esti-lp-section-break__eyebrow">07 / Practice Notes</p>
          <h2 id="insights-title">Read after the product has introduced itself</h2>
          <p>
            Essays grouped by how an architecture office thinks: practice, revisions,
            approvals, and Indian operating context.
          </p>
          <Link to="/blog" className="esti-lp-inline-link">All articles →</Link>
        </div>
      </section>

      <div className="esti-lp-grid esti-lp-insights-grid" aria-labelledby="insights-title">
        {groups.map((group) => (
          <nav key={group.heading} className="esti-lp-tile esti-lp-insights-upcoming" aria-label={group.heading}>
            <div className="esti-lp-tile__hdr">
              <span className="esti-lp-dot esti-lp-dot--white" aria-hidden>●</span>
              <span className="esti-lp-tile__hdr-label">{group.heading}</span>
            </div>
            <ul>
              {group.posts.map((post) => (
                <li key={post.slug}>
                  <span aria-hidden>→</span>
                  <Link to={`/blog/${post.slug}`}>
                    {post.title}
                    <small>{formatPostDate(post.date)} · {post.readingMinutes} min</small>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </>
  );
}
