/** SEO for `/aorms-consultancy` — engineering app marketing (roadmap). */
import {
  AORMS_CONSULTANCY,
  AORMS_PLATFORM,
  AORMS_STUDIO,
  EMOI,
  ESTI,
} from "./product-nomenclature.js";

const BASE = `https://aorms.in${AORMS_CONSULTANCY.marketingPath}`;

export const CONSULTANCY_LANDING_SEO = {
  title: `${AORMS_CONSULTANCY.title} | Engineering consultancy on AORMS`,
  description:
    `${AORMS_CONSULTANCY.title} — the engineering consultancy app on AORMS for structural, MEP, civil, and multidisciplinary firms. Engagement frameworks, review chains, and EmOI external AI. Roadmap.`,
  keywords:
    "engineering consultancy software, structural consultancy software, MEP consultancy, civil engineering consultancy, AORMS-Consultancy, AEC consulting, EmOI, operational framework",
  ogTitle: `${AORMS_CONSULTANCY.title} — engineering consultancies on one spine`,
  ogDescription:
    "Operational and design frameworks for structural, MEP, civil, and multidisciplinary engineering consultancies — on the AORMS platform. Roadmap.",
  twitterTitle: `${AORMS_CONSULTANCY.title} — roadmap for engineering firms`,
  twitterDescription:
    "Engagement frameworks, serial review chains, and governed knowledge for engineering consultancies advising on built-environment projects.",
  headline: "One spine for engineering consultancies that advise.",
  footerBlurb: `${AORMS_CONSULTANCY.title} on ${AORMS_PLATFORM.name} — roadmap.`,
  canonical: BASE,
  siteName: AORMS_PLATFORM.name,
  wikiUrl: `https://aorms.in${AORMS_CONSULTANCY.wikiPath}`,
} as const;

export const CONSULTANCY_LANDING_FAQ = [
  {
    question: `What is ${AORMS_CONSULTANCY.title}?`,
    answer:
      `${AORMS_CONSULTANCY.title} is the engineering consultancy app on AORMS — for structural, MEP, civil, and multidisciplinary firms that advise on built-environment projects. It shares the same platform spine as ${AORMS_STUDIO.title} but ships discipline-specific engagement and deliverable frameworks.`,
  },
  {
    question: "When will it ship?",
    answer:
      `${AORMS_CONSULTANCY.title} is on the roadmap. ${AORMS_STUDIO.title} for architecture consultancies ships today at ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")}. Contact hi@aorms.in if you want early access conversations for an engineering practice.`,
  },
  {
    question: `How does it relate to ${AORMS_STUDIO.title}?`,
    answer:
      `Both are apps on the same AORMS platform. ${AORMS_STUDIO.title} covers architecture consultancies (fees, drawings, GST, ESTI internal agent). ${AORMS_CONSULTANCY.title} covers engineering consultancies (calculations, reports, peer review chains, EmOI external agent at launch).`,
  },
  {
    question: "What AI agents does it use?",
    answer:
      `${EMOI.name} (${EMOI.expansion}) is the ${EMOI.role.toLowerCase()} — validates content from outside sources. An internal-agent profile (like ${ESTI.name} in ${AORMS_STUDIO.title}) follows on the roadmap.`,
  },
  {
    question: "Is this construction project management?",
    answer:
      "No. AORMS is built for consultancies that advise — not contractors delivering works or running client construction programmes.",
  },
  {
    question: "Where is the documentation?",
    answer:
      `The ${AORMS_CONSULTANCY.title} wiki page at aorms.in${AORMS_CONSULTANCY.wikiPath} describes the roadmap scope. Platform documentation lives at aorms.in/wiki.`,
  },
] as const;

export function applyConsultancyLandingSeo(): void {
  document.title = CONSULTANCY_LANDING_SEO.title;

  const setMeta = (selector: string, attr: "content" | "href", value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", CONSULTANCY_LANDING_SEO.description);
  setMeta('meta[name="keywords"]', "content", CONSULTANCY_LANDING_SEO.keywords);
  setMeta('meta[property="og:title"]', "content", CONSULTANCY_LANDING_SEO.ogTitle);
  setMeta('meta[property="og:description"]', "content", CONSULTANCY_LANDING_SEO.ogDescription);
  setMeta('meta[name="twitter:title"]', "content", CONSULTANCY_LANDING_SEO.twitterTitle);
  setMeta('meta[name="twitter:description"]', "content", CONSULTANCY_LANDING_SEO.twitterDescription);
  setMeta('link[rel="canonical"]', "href", CONSULTANCY_LANDING_SEO.canonical);
}

export function injectConsultancyLandingJsonLd(): void {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${CONSULTANCY_LANDING_SEO.canonical}#webpage`,
        url: CONSULTANCY_LANDING_SEO.canonical,
        name: CONSULTANCY_LANDING_SEO.ogTitle,
        description: CONSULTANCY_LANDING_SEO.description,
        isPartOf: { "@id": "https://aorms.in/#website" },
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        "@id": `${CONSULTANCY_LANDING_SEO.canonical}#faq`,
        mainEntity: CONSULTANCY_LANDING_FAQ.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const id = "esti-consultancy-landing-jsonld";
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(graph);
}
