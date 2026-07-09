const SIGNALS = [
  "Unlimited users, clients and projects",
  "5 GB storage included — usage-based AI",
  "AORMS Estimate on Windows for BOQ",
] as const;

export function MarketingHero() {
  return (
    <section className="lp2-hero-wrap" id="top" aria-labelledby="lp2-h1">
      <div className="lp2-hero">
        <p className="lp2-hero__eyebrow">
          Architecture Office Resource Management System
        </p>

        <h1 id="lp2-h1" className="lp2-hero__h1">
          Run your practice with the same discipline as your drawings.
        </h1>

        <p className="lp2-hero__sub">
          One cloud workspace for Indian architects and interior designers —
          projects, fee recovery, revision intelligence, GST and team, in a single record.
        </p>

        <ul className="lp2-hero__signals" aria-label="Key facts">
          {SIGNALS.map((s) => (
            <li key={s}>
              <span className="lp2-dot lp2-dot--orange" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
