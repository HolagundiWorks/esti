import { ArrowRight } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import type { DemoKind } from "../../lib/landing-demo.js";

const STATUS_LINES = [
  { label: "Built for architecture practices", dot: "green" },
  { label: "India-ready operations", dot: "green" },
  { label: "AI-assisted office intelligence", dot: "yellow" },
  { label: "Demo workspace available", dot: "green" },
] as const;

export function MarketingHero({
  onStudioDemo,
  onTrialScroll,
  demoLoading,
  demoKind,
}: {
  onStudioDemo: () => void;
  onSoloDemo?: () => void;
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
        Run your architecture firm<br />from one command center.
      </h1>

      <p className="esti-lp-hero__sub">
        Projects · Fees · Teams · Compliance · Client portals · AI
      </p>

      <p className="esti-lp-hero__lead">
        AORMS replaces scattered spreadsheets, WhatsApp follow-ups, fee trackers, and project memory
        with one operating system for architecture practices.
      </p>

      <div className="esti-lp-hero__actions">
        <Button
          kind="primary"
          size="lg"
          renderIcon={ArrowRight}
          onClick={onStudioDemo}
          disabled={demoLoading}
        >
          {demoLoading && demoKind === "studio" ? "Opening…" : "Open Practice Demo"}
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
