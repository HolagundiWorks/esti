import { ArrowRight } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import type { DemoKind } from "../../lib/landing-demo.js";

const STATUS_LINES = [
  { label: "Built for Indian architecture consultancies", dot: "green" },
  { label: "Projects, fees, approvals and billing in one record", dot: "green" },
  { label: "GST invoicing and 26AS / AIS / GSTR reconciliation built in", dot: "green" },
  { label: "Native desktop app — runs offline on your machine", dot: "yellow" },
  { label: "Working demo office available", dot: "green" },
] as const;

export function MarketingHero({
  onStudioDemo,
  onTrialScroll,
  demoLoading,
  demoKind,
}: {
  onStudioDemo: () => void;
  onTrialScroll?: () => void;
  demoLoading: boolean;
  demoKind?: DemoKind | null;
}) {
  return (
    <section className="esti-lp-hero" id="top" aria-labelledby="hero-title">
      <p className="esti-lp-hero__sysid">
        AORMS — Architecture Office Resource Management System
      </p>

      <h1 id="hero-title" className="esti-lp-hero__h1">
        AORMS — Architecture Office <br />Resource Management System
      </h1>

      <p className="esti-lp-hero__sub">
        Projects · Revisions · Approvals · Fees · GST · Reconciliation · Team · Portals
      </p>

      <p className="esti-lp-hero__lead">
        Architecture firms do not fail because they cannot design. They lose time,
        money, and peace because office memory is scattered across messages,
        spreadsheets, verbal approvals, and repeated follow-ups.
      </p>

      <div className="esti-lp-hero__actions">
        <Button
          kind="primary"
          size="lg"
          renderIcon={ArrowRight}
          onClick={onStudioDemo}
          disabled={demoLoading}
        >
          {demoLoading && demoKind === "team" ? "Opening…" : "Open Team Demo"}
        </Button>
        {onTrialScroll && (
          <Button kind="ghost" size="lg" onClick={onTrialScroll}>
            Request Workspace
          </Button>
        )}
      </div>

      <div className="esti-lp-hero__status" aria-label="System status">
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
