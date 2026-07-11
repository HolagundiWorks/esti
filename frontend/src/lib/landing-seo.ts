/** Landing-page SEO — platform home `/`. Keep in sync with index.html meta tags. */
import { AORMS_STUDIO, AORMS_PLATFORM, EMOI, ESTI } from "./product-nomenclature.js";

export const LANDING_SEO = {
  title: `AORMS | ${AORMS_PLATFORM.expansion}`,
  description:
    "Operational and design frameworks for consulting offices advising in risk, education, auditing, and AEC — one spine with EmOI intelligence. Not solution delivery. Not project management.",
  keywords:
    "AORMS, EmOI, consulting frameworks, operational framework, design framework, advisory consulting, risk management consulting, audit consulting, AEC consulting, workflow consolidation",
  ogTitle: `AORMS — ${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  ogDescription:
    "Accelerated Operational Resources Management System: operational and design frameworks for advisory consulting offices — risk, education, auditing, and AEC. One spine. Not solution delivery or project management.",
  twitterTitle: "AORMS — frameworks for advisory consultancies",
  twitterDescription:
    `Operational + design frameworks for consulting offices. EmOI dual-tier intelligence. ${AORMS_STUDIO.title} shipping for Indian architecture consultancies.`,
  headline: `${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  footerBlurb: `${AORMS_PLATFORM.name} (${AORMS_PLATFORM.expansion}).`,
  canonical: "https://aorms.in/",
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/wiki",
} as const;

export const LANDING_FAQ = [
  {
    question: "What is AORMS?",
    answer:
      `AORMS (Accelerated Operational Resources Management System) is a pre-release platform for consulting offices that advise clients — an operational framework and a design framework on one spine, with EmOI dual-tier intelligence. We are not in solution delivery or project management. ${AORMS_STUDIO.title} ships today for Indian architecture consultancies, with ESTI as its studio intelligence layer.`,
  },
  {
    question: "Who is the platform for?",
    answer:
      "Consulting offices that advise in risk management, education, auditing, and AEC — firms of 5–500 people replacing scattered messaging, advisory workflows, documentation, email, sheets, and file sharing. AEC ships today; risk, education, and auditing workspaces are on the roadmap.",
  },
  {
    question: "What are the operational and design frameworks?",
    answer:
      "The operational framework is how the consulting office runs — intake, process standards, review, audit, and governed knowledge. The design framework is how engagements are structured — methodologies, deliverable models, and versioned advisory templates. AORMS is built for consultancies that advise, not firms that deliver solutions or run client project management.",
  },
  {
    question: "What is the dual-tier AI architecture?",
    answer:
      "An external AI module validates and gates content from outside sources; an internal RAG module answers only from validated repositories — reducing hallucination and compliance drift. See the Core Architecture section on this page.",
  },
  {
    question: "Where is the architecture workspace documentation?",
    answer:
      `The ${AORMS_STUDIO.title} user guide lives at aorms.in/wiki — getting started, finance, workflows, and account setup for Indian architecture practices.`,
  },
  {
    question: "What is EmOI?",
    answer:
      `${EMOI.name} (${EMOI.expansion}) is the intelligence layer on the AORMS platform — dual-tier AI governance, workflow intelligence, internal RAG, and governed answers across operational verticals.`,
  },
  {
    question: "What is ESTI?",
    answer:
      `${ESTI.name} (${ESTI.expansion}) is the architecture-only intelligence layer inside ${AORMS_STUDIO.title} — Ask ESTI, AI Studio, Studio Intelligence, and ESTI Pulse. It does not replace EmOI on the wider platform.`,
  },
  {
    question: "Is this documentation the shipped product?",
    answer:
      `This page is the platform north-star (v1.0 pre-release). The live browser workspace at app.aorms.in implements ${AORMS_STUDIO.title}; stack details differ in places (Fastify + tRPC today vs REST/GraphQL in the north-star spec).`,
  },
] as const;

export function applyLandingSeo(): void {
  document.title = LANDING_SEO.title;

  const setMeta = (selector: string, attr: "content" | "href", value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", LANDING_SEO.description);
  setMeta('meta[name="keywords"]', "content", LANDING_SEO.keywords);
  setMeta('meta[property="og:title"]', "content", LANDING_SEO.ogTitle);
  setMeta('meta[property="og:description"]', "content", LANDING_SEO.ogDescription);
  setMeta('meta[name="twitter:title"]', "content", LANDING_SEO.twitterTitle);
  setMeta('meta[name="twitter:description"]', "content", LANDING_SEO.twitterDescription);
  setMeta('link[rel="canonical"]', "href", LANDING_SEO.canonical);
}

/** Runtime JSON-LD refresh — aligns SPA with product law after hydration. */
export function injectLandingJsonLd(): void {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://aorms.in/#website",
        url: "https://aorms.in/",
        name: "AORMS",
        description: LANDING_SEO.description,
        inLanguage: "en-IN",
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "WebSite",
        "@id": "https://aorms.in/wiki#website",
        url: "https://aorms.in/wiki",
        name: AORMS_STUDIO.wikiName,
        description: `Official documentation for ${AORMS_STUDIO.title} on the AORMS platform.`,
        inLanguage: "en-IN",
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "Organization",
        "@id": "https://aorms.in/#organization",
        name: "Human Centric Works",
        url: "https://aorms.in",
        email: "hi@aorms.in",
        telephone: "+91-8951089191",
        logo: "https://aorms.in/hcw-black.png",
        sameAs: ["https://www.linkedin.com/company/aorms"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Hospet",
          addressRegion: "Karnataka",
          addressCountry: "IN",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://aorms.in/#software",
        name: AORMS_PLATFORM.name,
        alternateName: [
          AORMS_PLATFORM.expansion,
          AORMS_STUDIO.title,
          EMOI.name,
          EMOI.expansion,
          ESTI.name,
          ESTI.expansion,
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://aorms.in/",
        description: LANDING_SEO.description,
        featureList:
          "operational framework, design framework, collaboration, review and approval, audit and compliance, knowledge base, analytics dashboards, EmOI dual-tier AI",
        audience: {
          "@type": "Audience",
          audienceType:
            "Consulting offices advising in risk management, education, auditing, and AEC (5–500 people)",
        },
        offers: {
          "@type": "Offer",
          name: `${AORMS_PLATFORM.name} platform`,
          description: `Pre-release platform. ${AORMS_STUDIO.title} vertical workspace available with standard licence.`,
          url: `https://aorms.in/login`,
        },
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "FAQPage",
        "@id": "https://aorms.in/#faq",
        mainEntity: LANDING_FAQ.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const id = "esti-landing-jsonld";
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(graph);
}
