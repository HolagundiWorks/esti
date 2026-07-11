import {
  KeywordStrip,
  Orb,
  Section,
  SectionHead,
  Tile,
  revealStyle,
} from "./LandingSections.js";
import { LANDING_FAQ } from "../../lib/landing-seo.js";
import { AORMS_PLATFORM, PLATFORM_FRAMEWORKS, PLATFORM_INDUSTRIES } from "../../lib/product-nomenclature.js";

const MODULES = [
  {
    dot: "orange" as const,
    tag: "01 · Operational",
    title: PLATFORM_FRAMEWORKS.operational.title,
    bullets: [
      "Intake, process mapping, office standards in days",
      "Versioning, rollout tracking, adoption metrics",
    ],
  },
  {
    dot: "green" as const,
    tag: "02 · Design",
    title: PLATFORM_FRAMEWORKS.design.title,
    bullets: [
      "Engagement methodology & deliverable templates",
      "Versioned advisory patterns — not client PM",
    ],
  },
  {
    dot: "yellow" as const,
    tag: "03 · Collaboration",
    title: "Unified workspace",
    bullets: ["Documents, channels, threads, @mentions", "Searchable archive — not lost chat history"],
  },
  {
    dot: "white" as const,
    tag: "04 · Review",
    title: "Approval workflows",
    bullets: ["Serial or parallel review chains", "SLA tracking, escalation, markup and version compare"],
  },
  {
    dot: "green" as const,
    tag: "05 · Audit",
    title: "Compliance reporting",
    bullets: ["Automated audit reports from live process data", "Risk flags, corrective actions, export to PDF"],
  },
  {
    dot: "yellow" as const,
    tag: "06 · Knowledge",
    title: "Resource library",
    bullets: ["Full-text + semantic search on validated content", "Usage tracking and in-context recommendations"],
  },
  {
    dot: "orange" as const,
    tag: "07 · Analytics",
    title: "Operational dashboards",
    bullets: ["Engagement cycle time, review SLA, framework adoption", "Custom widgets and scheduled executive reports"],
  },
] as const;

const FIREWALL_STEPS = [
  { gate: "Quality gate", layer: "External AI", detail: "Fetch · validate · enrich · store" },
  { gate: "Safety gate", layer: "Internal RAG", detail: "Retrieve · cite · generate · audit" },
] as const;

export function PlatformTrustStrip() {
  return (
    <section
      className="lp2-ds-section lp2-plat-trust lp2-reveal"
      id="platform"
      aria-label="Fragmented operational tools"
      style={revealStyle(40)}
    >
      <p className="lp2-plat-trust__label">Scattered tools you are replacing</p>
      <ul className="lp2-plat-trust__tools">
        {AORMS_PLATFORM.fragmentedTools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
      <p className="lp2-plat-trust__arrow" aria-hidden>
        ↓
      </p>
      <p className="lp2-plat-trust__spine">
        <strong>{AORMS_PLATFORM.name}</strong> — one spine for advisory consulting offices
      </p>
    </section>
  );
}

export function FrameworksSection() {
  return (
    <Section id="frameworks" labelledBy="fw-head">
      <SectionHead
        id="fw-head"
        tag="Two frameworks"
        problem="Advisory consultancies need both office operations and engagement design — rarely in one system."
        solution={`${PLATFORM_FRAMEWORKS.operational.title} standardises how the practice runs. ${PLATFORM_FRAMEWORKS.design.title} models how client engagements are structured. AORMS ships both — not solution delivery, not project management.`}
      />
      <div className="lp2-plat-frameworks lp2-reveal" style={revealStyle(50)}>
        {(Object.keys(PLATFORM_FRAMEWORKS) as Array<keyof typeof PLATFORM_FRAMEWORKS>).map(
          (key, i) => {
            const fw = PLATFORM_FRAMEWORKS[key];
            return (
              <article
                key={key}
                className="lp2-plat-framework"
                style={revealStyle(70 + i * 40)}
              >
                <h3 className="lp2-plat-framework__title">{fw.title}</h3>
                <p className="lp2-plat-framework__body">{fw.summary}</p>
              </article>
            );
          },
        )}
      </div>
    </Section>
  );
}

export function DualTierAISection() {
  return (
    <Section id="ai-firewall" labelledBy="ai-head">
      <SectionHead
        id="ai-head"
        tag="EmOI · Dual-tier AI"
        problem="Generic AI on raw documents hallucinates — and compliance drifts."
        solution="EmOI (Embedded Operational Intelligence) gates external AI as the quality layer and internal RAG as the safety layer. No unvalidated content enters the knowledge base. Every answer cites approved sources."
      />
      <div className="lp2-plat-firewall lp2-reveal" style={revealStyle(50)}>
        <div className="lp2-plat-firewall__flow" role="img" aria-label="External source to validated repository to internal RAG output">
          <span className="lp2-plat-firewall__node">External sources</span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node lp2-plat-firewall__node--gate">
            External AI
            <small>Quality gate</small>
          </span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node">Validated repository</span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node lp2-plat-firewall__node--gate">
            Internal RAG
            <small>Safety gate</small>
          </span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node lp2-plat-firewall__node--out">Reports · audits · recommendations</span>
        </div>
        <div className="lp2-plat-firewall__cards">
          {FIREWALL_STEPS.map((s, i) => (
            <article key={s.layer} className="lp2-plat-firewall__card" style={revealStyle(80 + i * 60)}>
              <p className="lp2-plat-firewall__card-tag">{s.gate}</p>
              <h3 className="lp2-plat-firewall__card-title">{s.layer}</h3>
              <p className="lp2-plat-firewall__card-body">{s.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function PlatformModulesSection() {
  return (
    <Section id="modules" labelledBy="mod-head">
      <SectionHead
        id="mod-head"
        tag="Platform modules"
        problem="Advisory consulting ops sprawl across tools that never share context."
        solution="Seven modules on one data model — operational and design frameworks first, then collaboration, review, audit, knowledge, and analytics. Built for consultancies, not solution delivery."
      />
      <div className="lp2-grid lp2-grid--3 lp2-plat-modules">
        {MODULES.map((m, i) => (
          <Tile key={m.tag} dot={m.dot} tag={m.tag} title={m.title} bullets={m.bullets} delay={40 + i * 45} />
        ))}
      </div>
      <KeywordStrip
        label="Platform thesis"
        marks={[
          { pain: "Disconnected tools", solution: "One spine" },
          { pain: "Raw AI risk", solution: "EmOI firewall" },
          { pain: "Ad hoc engagements", solution: "Design framework" },
          { pain: "Slow rollout", solution: "Operational framework" },
        ]}
      />
    </Section>
  );
}

export function IndustriesSection() {
  return (
    <Section id="industries" labelledBy="ind-head">
      <SectionHead
        id="ind-head"
        tag="Industries we care about"
        problem="Consulting offices advising in regulated domains need both frameworks — how the practice runs and how engagements are modelled."
        solution="Risk, education, auditing, and AEC consultancies share the same AORMS spine. AEC ships today. We advise clients — we do not deliver solutions or run project management."
      />
      <div className="lp2-plat-verticals lp2-reveal" style={revealStyle(50)}>
        {PLATFORM_INDUSTRIES.map((industry, i) => {
          const live = industry.status === "live";
          return (
            <article
              key={industry.id}
              className={`lp2-plat-vertical${live ? " lp2-plat-vertical--live" : ""}`}
              style={revealStyle(70 + i * 50)}
            >
              <div className="lp2-plat-vertical__hdr">
                <Orb color={live ? "green" : "white"} />
                <span className="lp2-plat-vertical__status">
                  {live ? "Shipping now" : "Roadmap"}
                </span>
              </div>
              <h3 className="lp2-plat-vertical__title">{industry.title}</h3>
              <p className="lp2-plat-vertical__subtitle">
                {industry.workspace}
                {" · "}
                {industry.subtitle}
              </p>
              <p className="lp2-plat-vertical__body">{industry.body}</p>
              <ul className="lp2-plat-vertical__list">
                {industry.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

/** @deprecated Use IndustriesSection — kept for import stability. */
export const VerticalsSection = IndustriesSection;

export function PlatformFaqSection() {
  return (
    <Section id="faq" labelledBy="plat-faq-head">
      <SectionHead
        id="plat-faq-head"
        tag="FAQ"
        problem="Platform questions principals ask before consolidating tools."
        solution="Short answers below — see the wiki for deeper documentation."
      />
      <div className="lp2-faq lp2-reveal" style={revealStyle(40)}>
        {LANDING_FAQ.map((f) => (
          <details key={f.question} className="lp2-faq__item">
            <summary className="lp2-faq__q">{f.question}</summary>
            <p className="lp2-faq__a">{f.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
