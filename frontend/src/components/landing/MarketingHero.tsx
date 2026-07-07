const STATUS_LINES = [
  { label: "Built only for Indian architectural practices", dot: "green" },
  { label: "Projects, fees, approvals and billing in one record", dot: "green" },
  { label: "GST invoicing and 26AS / AIS / GSTR reconciliation built in", dot: "green" },
  { label: "Native desktop app — runs offline on your machine", dot: "yellow" },
  { label: "Free Community edition, no credit card required", dot: "green" },
] as const;

export function MarketingHero() {
  return (
    <section className="esti-lp-hero" id="top" aria-labelledby="hero-title">
      <p className="esti-lp-hero__sysid">
        AORMS · India&rsquo;s first standardized operational framework for architectural consultancy practices
      </p>

      <h1 id="hero-title" className="esti-lp-hero__h1">
        Run every project the same way — and stop losing fees to revisions you never agreed to.
      </h1>

      <p className="esti-lp-hero__sub">
        Projects, revisions, approvals, fees and GST — one record, one standard, every project.
      </p>

      <p className="esti-lp-hero__lead">
        Architectural practices don&rsquo;t fail because they can&rsquo;t design. They lose
        time, fees, and peace because the office runs on memory — scattered across
        chats, spreadsheets, and verbal approvals no one can find later.
      </p>

      <div className="esti-lp-hero__status" aria-label="Product preview">
        {STATUS_LINES.map((s) => (
          <p key={s.label} className="esti-lp-hero__status-line">
            <span className={`esti-lp-dot esti-lp-dot--${s.dot}`} aria-hidden>●</span>
            {s.label}
          </p>
        ))}
      </div>
    </section>
  );
}
