import {
  KeywordStrip,
  Orb,
  Section,
  SectionHead,
  Tile,
  revealStyle,
} from "./LandingSections.js";
import { Link } from "react-router-dom";
import { LANDING_FAQ } from "../../lib/landing-seo.js";
import { AORMS_PLATFORM, EMOI, ESTI, PLATFORM_APPS, PLATFORM_FRAMEWORKS } from "../../lib/product-nomenclature.js";

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
  { gate: "Quality gate", layer: EMOI.name, detail: `${EMOI.role} · fetch · validate · enrich · store` },
  { gate: "Safety gate", layer: ESTI.name, detail: `${ESTI.role} · retrieve · cite · generate · audit` },
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
        <strong>{AORMS_PLATFORM.name}</strong> — one spine for AEC consulting firms
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
        problem="AEC consultancies need both office operations and engagement design — rarely in one system."
        solution={`${PLATFORM_FRAMEWORKS.operational.title} standardises how the practice runs. ${PLATFORM_FRAMEWORKS.design.title} models how client engagements are structured. AORMS ships both for architecture and engineering firms — not solution delivery, not construction PM.`}
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
        tag={`${EMOI.name} + ${ESTI.name}`}
        problem="Generic AI on raw documents hallucinates — and compliance drifts."
        solution={`${EMOI.name} (${EMOI.expansion}) is the ${EMOI.role.toLowerCase()} — it validates content from outside sources before it enters the firm. ${ESTI.name} (${ESTI.expansion}) is the ${ESTI.role.toLowerCase()} — it answers only from validated repositories. No unvalidated content becomes firm truth.`}
      />
      <div className="lp2-plat-firewall lp2-reveal" style={revealStyle(50)}>
        <div className="lp2-plat-firewall__flow" role="img" aria-label={`External sources through ${EMOI.name} to validated repository through ${ESTI.name} to output`}>
          <span className="lp2-plat-firewall__node">External sources</span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node lp2-plat-firewall__node--gate">
            {EMOI.name}
            <small>{EMOI.role}</small>
          </span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node">Validated repository</span>
          <span className="lp2-plat-firewall__arrow" aria-hidden />
          <span className="lp2-plat-firewall__node lp2-plat-firewall__node--gate">
            {ESTI.name}
            <small>{ESTI.role}</small>
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
        problem="AEC consulting ops sprawl across tools that never share context."
        solution="Seven modules on one data model — operational and design frameworks first, then collaboration, review, audit, knowledge, and analytics. Built for AEC consultancies that advise, not solution delivery."
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
          { pain: "Raw AI risk", solution: `${EMOI.name} external gate` },
          { pain: "Ad hoc engagements", solution: "Design framework" },
          { pain: "Slow rollout", solution: "Operational framework" },
        ]}
      />
    </Section>
  );
}

export function AppsSection() {
  return (
    <Section id="apps" labelledBy="apps-head">
      <SectionHead
        id="apps-head"
        tag="Two apps"
        problem="Architecture and engineering consultancies run on the same advisory spine — but need discipline-specific workspaces."
        solution="AORMS ships as two apps on one platform: AORMS-Studio for architecture consultancies (live) and AORMS-Consultancy for engineering consultancies (roadmap). We advise clients — we do not deliver solutions or run construction project management."
      />
      <div className="lp2-plat-verticals lp2-reveal" style={revealStyle(50)}>
        {PLATFORM_APPS.map((app, i) => {
          const live = app.status === "live";
          return (
            <article
              key={app.id}
              className={`lp2-plat-vertical${live ? " lp2-plat-vertical--live" : ""}`}
              style={revealStyle(70 + i * 50)}
            >
              <div className="lp2-plat-vertical__hdr">
                <Orb color={live ? "green" : "white"} />
                <span className="lp2-plat-vertical__status">
                  {live ? "Shipping now" : "Roadmap"}
                </span>
              </div>
              <h3 className="lp2-plat-vertical__title">{app.title}</h3>
              <p className="lp2-plat-vertical__subtitle">
                {app.workspace}
                {" · "}
                {app.subtitle}
              </p>
              <p className="lp2-plat-vertical__body">{app.body}</p>
              <ul className="lp2-plat-vertical__list">
                {app.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link className="lp2-plat-vertical__cta" to={app.href}>
                {app.cta} →
              </Link>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

/** @deprecated Use AppsSection — kept for import stability. */
export const IndustriesSection = AppsSection;

/** @deprecated Use AppsSection. */
export const VerticalsSection = AppsSection;

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
