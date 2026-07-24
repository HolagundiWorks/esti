/** SEO for /login — AORMS-Studio marketing + sign-in (canonical vertical entry page). */
import { AORMS_STUDIO, AORMS_PLATFORM, EOMS, ESTI } from "./product-nomenclature.js";

const BASE = "https://aorms.in/";
const LEGACY_SLUGS = AORMS_STUDIO.legacySlugs.join(", ");

export const ARCHITECTURE_LANDING_SEO = {
  title: `${AORMS_STUDIO.title} | Advisory workspace for Indian architecture consultancies`,
  description:
    `${AORMS_STUDIO.title} — the architecture consultancy workspace on AORMS — fee recovery, MoM-led client revisions, GST billing, drawings, studio load and portals. Not construction project management. Unlimited users. 5 GB included.`,
  keywords:
    `architecture consultancy software India, architecture advisory practice, fee recovery architects, architect fee proposal software COA, GST billing architects India, client revision management architects, AORMS-Studio, ${LEGACY_SLUGS}, ESTI`,
  ogTitle: `${AORMS_STUDIO.title} — from chaos to clarity`,
  ogDescription:
    `One cloud workspace for Indian architecture consultancies: fee recovery, MoM-to-site revisions, GST, drawings, studio load and portals — ${AORMS_STUDIO.title} on the AORMS platform.`,
  twitterTitle: `${AORMS_STUDIO.title} — advisory workspace for Indian consultancies`,
  twitterDescription:
    "Fees, MoM-led revisions, GST and studio load in one browser workspace. Unlimited users · 5 GB included.",
  headline: "From chaos to clarity. One living record for the practice.",
  footerBlurb: `${AORMS_STUDIO.title} on ${AORMS_PLATFORM.name}.`,
  canonical: `${BASE}`,
  siteName: AORMS_PLATFORM.name,
  wikiUrl: "https://aorms.in/wiki",
} as const;

export const ARCHITECTURE_LANDING_FAQ = [
  {
    question: `Who is ${AORMS_STUDIO.title} for?`,
    answer:
      "Registered architects, interior designers and architectural consultancy practices in India — from solo studios to mid-sized firms. Unlimited users on every account.",
  },
  {
    question: "How does fee recovery work?",
    answer:
      "The workspace shows what is ready to invoice, the next COA payment stage, incoming receipts and due dates on the project record. GST invoices and filing reminders stay on the same trail.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Every account includes 5 GB storage and the full workspace. Pay for additional storage per GB-month and for hosted AI usage, or bring your own OpenAI-compatible API key.",
  },
  {
    question: "Is there a desktop app?",
    answer:
      "No. The workspace runs entirely in your browser — projects, finance, drawings and portals in one cloud account.",
  },
  {
    question: "Where is the documentation?",
    answer:
      "The official AORMS Wiki at aorms.in/wiki covers getting started, workflows, finance and account setup.",
  },
  {
    question: "How does client revision management work?",
    answer:
      "Discussion becomes minutes of meeting. ESTI extracts implied revisions; the architect marks criticality; the client approves — then drawings and site move with a dated trail.",
  },
  {
    question: "Can I use my own AI API key?",
    answer:
      "Yes. In Company → AI you can set an OpenAI-compatible endpoint and API key. ESTI also extracts revision items from minutes of meeting.",
  },
  {
    question: "Does it cover pre-construction risk and opportunity?",
    answer:
      "Yes. On each project, Brief → R&O holds a risk register, opportunity scorecard, and design phase gates (concept through issue readiness). It is consultancy delivery — not construction project management.",
  },
  {
    question: "What is the relationship to AORMS platform?",
    answer:
      `AORMS (${AORMS_PLATFORM.expansion}) is the platform for AEC consulting firms — ${EOMS.name} (${EOMS.role.toLowerCase()}) and ${ESTI.name} (${ESTI.role.toLowerCase()} in ${AORMS_STUDIO.title}). ${AORMS_STUDIO.title} is the shipping architecture app for Indian architecture practices.`,
  },
] as const;

export function applyArchitectureLandingSeo(): void {
  document.title = ARCHITECTURE_LANDING_SEO.title;

  const setMeta = (selector: string, attr: "content" | "href", value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", ARCHITECTURE_LANDING_SEO.description);
  setMeta('meta[name="keywords"]', "content", ARCHITECTURE_LANDING_SEO.keywords);
  setMeta('meta[property="og:title"]', "content", ARCHITECTURE_LANDING_SEO.ogTitle);
  setMeta('meta[property="og:description"]', "content", ARCHITECTURE_LANDING_SEO.ogDescription);
  setMeta('meta[name="twitter:title"]', "content", ARCHITECTURE_LANDING_SEO.twitterTitle);
  setMeta('meta[name="twitter:description"]', "content", ARCHITECTURE_LANDING_SEO.twitterDescription);
  setMeta('link[rel="canonical"]', "href", ARCHITECTURE_LANDING_SEO.canonical);
}

export function injectArchitectureLandingJsonLd(): void {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#webpage`,
        url: ARCHITECTURE_LANDING_SEO.canonical,
        name: ARCHITECTURE_LANDING_SEO.ogTitle,
        description: ARCHITECTURE_LANDING_SEO.description,
        isPartOf: { "@id": "https://aorms.in/#website" },
        inLanguage: "en-IN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#software`,
        name: AORMS_STUDIO.title,
        alternateName: [AORMS_PLATFORM.expansion, ESTI.name, ESTI.expansion, ...AORMS_STUDIO.legacySlugs],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: AORMS_STUDIO.appUrl,
        description: ARCHITECTURE_LANDING_SEO.description,
        audience: {
          "@type": "Audience",
          audienceType: AORMS_STUDIO.audience,
        },
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "FAQPage",
        "@id": `${ARCHITECTURE_LANDING_SEO.canonical}#faq`,
        mainEntity: ARCHITECTURE_LANDING_FAQ.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(graph);
  document.head.appendChild(script);
}
