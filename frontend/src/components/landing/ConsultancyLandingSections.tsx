import { Link } from "react-router-dom";
import { CONSULTANCY_LANDING_FAQ } from "../../lib/consultancy-landing-seo.js";
import {
  AORMS_CONSULTANCY,
  AORMS_STUDIO,
  EMOI,
  ESTI,
  PLATFORM_FRAMEWORKS,
} from "../../lib/product-nomenclature.js";
import { KeywordStrip, Orb, Section, SectionHead, revealStyle } from "./LandingSections.js";

const CAPABILITIES = [
  {
    dot: "orange" as const,
    title: "Engagement frameworks",
    body: "Scope agreements, deliverable models, and versioned templates for advisory engineering work.",
  },
  {
    dot: "green" as const,
    title: "Serial review chains",
    body: "Peer review, checker sign-off, and SLA-tracked approval before issue to client or architect.",
  },
  {
    dot: "yellow" as const,
    title: "Deliverable register",
    body: "Calculations, reports, and technical submissions with revision control — not a generic task board.",
  },
  {
    dot: "white" as const,
    title: "Governed knowledge",
    body: "Validated codes, office standards, and project precedents searchable inside the tenant boundary.",
  },
] as const;

export function ConsultancyFrameworksSection() {
  return (
    <Section id="frameworks" labelledBy="cons-fw-head">
      <SectionHead
        id="cons-fw-head"
        tag="Same platform spine"
        problem="Engineering consultancies need the same operational discipline as architecture firms — rarely in one system."
        solution={`${PLATFORM_FRAMEWORKS.operational.title} standardises how the practice runs. ${PLATFORM_FRAMEWORKS.design.title} models how engagements are structured. ${AORMS_CONSULTANCY.title} ships both for engineering firms on the AORMS platform.`}
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

export function ConsultancyCapabilitiesSection() {
  return (
    <Section id="capabilities" labelledBy="cons-cap-head">
      <SectionHead
        id="cons-cap-head"
        tag="Engineering-first"
        problem="Generic PM tools assume you are delivering the client's build programme."
        solution="AORMS-Consultancy models advisory engineering — engagements, deliverables, review chains, and governed technical knowledge."
      />
      <div className="lp2-grid lp2-grid--2 lp2-plat-modules">
        {CAPABILITIES.map((item, i) => (
          <article
            key={item.title}
            className="lp2-plat-framework lp2-reveal"
            style={revealStyle(40 + i * 45)}
          >
            <div className="lp2-plat-vertical__hdr">
              <Orb color={item.dot} />
            </div>
            <h3 className="lp2-plat-framework__title">{item.title}</h3>
            <p className="lp2-plat-framework__body">{item.body}</p>
          </article>
        ))}
      </div>
      <KeywordStrip
        label="Roadmap thesis"
        marks={[
          { pain: "Scattered calculations", solution: "Deliverable register" },
          { pain: "Informal peer review", solution: "Serial sign-off chains" },
          { pain: "External code drift", solution: `${EMOI.name} external agent` },
          { pain: "Siloed firm knowledge", solution: "Governed repository" },
        ]}
      />
    </Section>
  );
}

export function ConsultancyAgentsSection() {
  return (
    <Section id="agents" labelledBy="cons-agents-head">
      <SectionHead
        id="cons-agents-head"
        tag={`${EMOI.name} + ${ESTI.name}`}
        problem="Engineering firms ingest external codes, standards, and client briefs — but answers must stay inside governed repositories."
        solution={`${EMOI.name} is the ${EMOI.role.toLowerCase()} at launch. An internal-agent profile (like ${ESTI.name} in ${AORMS_STUDIO.title}) follows on the roadmap.`}
      />
      <div className="lp2-plat-frameworks lp2-reveal" style={revealStyle(50)}>
        <article className="lp2-plat-framework" style={revealStyle(60)}>
          <h3 className="lp2-plat-framework__title">{EMOI.name} — {EMOI.role}</h3>
          <p className="lp2-plat-framework__body">{EMOI.summary}</p>
        </article>
        <article className="lp2-plat-framework" style={revealStyle(90)}>
          <h3 className="lp2-plat-framework__title">{ESTI.name} — {ESTI.role}</h3>
          <p className="lp2-plat-framework__body">
            {ESTI.summary} Ships in {AORMS_STUDIO.title} today; {AORMS_CONSULTANCY.title} internal-agent
            profile on roadmap.
          </p>
        </article>
      </div>
    </Section>
  );
}

export function ConsultancyCompareSection() {
  return (
    <Section id="compare" labelledBy="cons-compare-head">
      <SectionHead
        id="cons-compare-head"
        tag="Two apps"
        problem="Architecture and engineering consultancies share a spine — but need different workspaces."
        solution={`${AORMS_STUDIO.title} ships for architecture. ${AORMS_CONSULTANCY.title} is the engineering app on the same platform.`}
      />
      <div className="lp2-plat-verticals lp2-reveal" style={revealStyle(40)}>
        <article className="lp2-plat-vertical lp2-plat-vertical--live" style={revealStyle(60)}>
          <div className="lp2-plat-vertical__hdr">
            <Orb color="green" />
            <span className="lp2-plat-vertical__status">Shipping now</span>
          </div>
          <h3 className="lp2-plat-vertical__title">{AORMS_STUDIO.discipline}</h3>
          <p className="lp2-plat-vertical__subtitle">{AORMS_STUDIO.title}</p>
          <p className="lp2-plat-vertical__body">{AORMS_STUDIO.audience}</p>
          <Link className="lp2-plat-vertical__cta" to={AORMS_STUDIO.marketingPath}>
            Explore {AORMS_STUDIO.title} →
          </Link>
        </article>
        <article className="lp2-plat-vertical" style={revealStyle(100)}>
          <div className="lp2-plat-vertical__hdr">
            <Orb color="white" />
            <span className="lp2-plat-vertical__status">Roadmap</span>
          </div>
          <h3 className="lp2-plat-vertical__title">{AORMS_CONSULTANCY.discipline}</h3>
          <p className="lp2-plat-vertical__subtitle">{AORMS_CONSULTANCY.title}</p>
          <p className="lp2-plat-vertical__body">{AORMS_CONSULTANCY.audience}</p>
          <Link className="lp2-plat-vertical__cta" to={AORMS_CONSULTANCY.wikiPath}>
            Wiki documentation →
          </Link>
        </article>
      </div>
    </Section>
  );
}

export function ConsultancyFaqSection() {
  return (
    <Section id="faq" labelledBy="cons-faq-head">
      <SectionHead
        id="cons-faq-head"
        tag="FAQ"
        problem="Questions engineering principals ask before the app ships."
        solution="Short answers below — see the wiki for the full roadmap scope."
      />
      <div className="lp2-faq lp2-reveal" style={revealStyle(40)}>
        {CONSULTANCY_LANDING_FAQ.map((f) => (
          <details key={f.question} className="lp2-faq__item">
            <summary className="lp2-faq__q">{f.question}</summary>
            <p className="lp2-faq__a">{f.answer}</p>
          </details>
        ))}
      </div>
      <p className="lp2-prose lp2-reveal" style={revealStyle(80)}>
        Interested in early access?{" "}
        <a href="mailto:hi@aorms.in">hi@aorms.in</a>
      </p>
    </Section>
  );
}
