/** Landing-page SEO — platform home `/`. Keep in sync with index.html meta tags. */
import {
  AORMS_CONSULTANCY,
  AORMS_PLATFORM,
  AORMS_STUDIO,
  EOMS,
  ESTI,
} from "./product-nomenclature.js";

export const LANDING_SEO = {
  title: `AORMS | ${AORMS_PLATFORM.expansion}`,
  description:
    "Operational and design frameworks for AEC consulting firms — architecture and engineering consultancies on one spine with EOMS intelligence. Not solution delivery. Not construction project management.",
  keywords:
    "AORMS, EOMS, AEC consulting, architecture consultancy software, engineering consultancy software, operational framework, design framework, AORMS-Studio, AORMS-Consultancy, workflow consolidation",
  ogTitle: `AORMS — ${AORMS_PLATFORM.heroHeadline[0]} ${AORMS_PLATFORM.heroHeadline[1]}`,
  ogDescription:
    "Accelerated Operational Resources Management System: operational and design frameworks for AEC consulting firms. Two apps — AORMS-Studio (architecture) and AORMS-Consultancy (engineering). One spine.",
  twitterTitle: "AORMS — frameworks for AEC consultancies",
  twitterDescription:
    `Operational + design frameworks for architecture and engineering consultancies. EOMS dual-tier intelligence. ${AORMS_STUDIO.title} shipping for Indian architecture practices; ${AORMS_CONSULTANCY.title} built — public launch forthcoming.`,
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
      `AORMS (Accelerated Operational Resources Management System) is a pre-release platform for AEC consulting firms — architecture and engineering practices that advise clients. It combines an operational framework and a design framework on one spine, with ${EOMS.name} as the ${EOMS.role.toLowerCase()} and ${ESTI.name} as the ${ESTI.role.toLowerCase()} in ${AORMS_STUDIO.title}. We are not in solution delivery or construction project management.`,
  },
  {
    question: "Who is the platform for?",
    answer:
      "AEC consulting firms — architecture and engineering practices of 5–500 people replacing scattered messaging, advisory workflows, documentation, email, sheets, and file sharing. AORMS-Studio ships for architecture consultancies; AORMS-Consultancy for engineering consultancies is built — public launch forthcoming.",
  },
  {
    question: "What are AORMS-Studio and AORMS-Consultancy?",
    answer:
      `${AORMS_STUDIO.title} is the architecture consultancy app — Indian architecture and design practices (live at ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")}). ${AORMS_CONSULTANCY.title} is the engineering consultancy app — structural, MEP, civil, and multidisciplinary firms (built; public launch forthcoming). Both share the same AORMS platform spine, ${EOMS.name} (${EOMS.role.toLowerCase()}), and an internal-agent profile per app.`,
  },
  {
    question: "What are the operational and design frameworks?",
    answer:
      "The operational framework is how the consulting office runs — intake, process standards, review, audit, and governed knowledge. The design framework is how engagements are structured — methodologies, deliverable models, and versioned advisory templates. AORMS is built for AEC consultancies that advise, not firms that deliver solutions or run construction project management.",
  },
  {
    question: "What is the dual-tier AI architecture?",
    answer:
      `${EOMS.name} (${EOMS.expansion}) is the ${EOMS.role.toLowerCase()} — apps query it for authoritative codes and compliance. ${ESTI.name} (${ESTI.expansion}) is the ${ESTI.role.toLowerCase()} — it answers only from validated firm repositories. See the ${EOMS.name} + ${ESTI.name} section on this page.`,
  },
  {
    question: `Where is the ${AORMS_STUDIO.title} documentation?`,
    answer:
      `The ${AORMS_STUDIO.title} user guide lives at aorms.in/wiki — getting started, finance, workflows, and account setup for Indian architecture practices.`,
  },
  {
    question: "What is EOMS?",
    answer:
      `${EOMS.name} (${EOMS.expansion}) is the ${EOMS.role.toLowerCase()} on the AORMS platform — ${EOMS.summary}`,
  },
  {
    question: "What is ESTI?",
    answer:
      `${ESTI.name} (${ESTI.expansion}) is the ${ESTI.role.toLowerCase()} — ${ESTI.summary} Live today in ${AORMS_STUDIO.title}; ${AORMS_CONSULTANCY.title} ships Ask / EOMS review on the same spine, with a distinct brand profile at public launch.`,
  },
  {
    question: "Is this documentation the shipped product?",
    answer:
      `This page is the platform north-star (v1.0 pre-release). The live browser workspace at ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")} implements ${AORMS_STUDIO.title}; stack details differ in places (Fastify + tRPC today vs REST/GraphQL in the north-star spec).`,
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
          AORMS_CONSULTANCY.title,
          EOMS.name,
          EOMS.expansion,
          ESTI.name,
          ESTI.expansion,
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://aorms.in/",
        description: LANDING_SEO.description,
        featureList:
          "operational framework, design framework, collaboration, review and approval, audit and compliance, knowledge base, analytics dashboards, EOMS knowledge bank, ESTI internal AI agent",
        audience: {
          "@type": "Audience",
          audienceType:
            "AEC consulting firms — architecture and engineering consultancies (5–500 people)",
        },
        offers: {
          "@type": "Offer",
          name: `${AORMS_PLATFORM.name} platform`,
          description: `Pre-release platform. ${AORMS_STUDIO.title} shipping with standard licence (web-only); ${AORMS_CONSULTANCY.title} built — public launch forthcoming.`,
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
