import type { CSSProperties } from "react";

const SIGNALS = [
  "Invoice-ready work, payment stages and due dates — on one record",
  "Revisions raised from minutes of meeting — verified, then on site",
  "Studio load you can see before someone is overloaded",
] as const;

/**
 * Hero — brand first, one composition. CTAs live in the ActionDock.
 */
export function MarketingHero() {
  return (
    <section className="lp2-hero-wrap" id="top" aria-labelledby="lp2-h1">
      <div className="lp2-hero">
        <p className="lp2-hero__brand lp2-hero-anim" style={{ "--lp-i": 0 } as CSSProperties}>
          AORMS
        </p>

        <h1 id="lp2-h1" className="lp2-hero__h1 lp2-hero-anim" style={{ "--lp-i": 1 } as CSSProperties}>
          From chaos to clarity.
          <span className="lp2-hero__h1-line">One living record for the practice.</span>
        </h1>

        <p className="lp2-hero__sub lp2-hero-anim" style={{ "--lp-i": 2 } as CSSProperties}>
          Fees, MoM-led revisions, GST and studio load stop living in folders,
          chats and spreadsheets — and share a single cloud workspace shaped for
          how Indian architecture studios actually work.
        </p>

        <ul className="lp2-hero__signals" aria-label="What gets clearer">
          {SIGNALS.map((s, i) => (
            <li
              key={s}
              className="lp2-hero-anim"
              style={{ "--lp-i": 3 + i } as CSSProperties}
            >
              <span className="lp2-dot lp2-dot--orange lp2-dot--pulse" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
