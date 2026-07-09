/** Landing-page SEO — keep in sync with index.html meta tags and JSON-LD. */
export const LANDING_SEO = {
  title: "AORMS | Practice management software for architects & designers in India",
  description:
    "AORMS is the cloud practice OS for Indian architects and interior designers — projects, COA fee proposals, drawing transmittals, revision intelligence, GST billing, in-browser estimation, team load and client portals. One standard licence, 5 GB included, unlimited users.",
  keywords:
    "architecture practice management software India, software for architects, architect office management, interior design practice software, architectural consultancy software, client revision management architects, drawing approval software, architect fee proposal software COA, GST billing architects India, architecture project management, ESTI AI architect assistant, BOQ estimating software CPWD, AORMS cloud workspace",
  ogTitle: "AORMS — Practice OS for architects & designers",
  ogDescription:
    "One cloud workspace for Indian architectural studios: projects, fees, revisions, GST, estimation, team and portals. Unlimited users. 5 GB included. No desktop installs.",
  twitterTitle: "AORMS — for architects who are tired of chasing their record",
  twitterDescription:
    "Projects, fees, revisions and GST in one browser workspace. Built for Indian architects. One licence · unlimited users · pay for storage and AI.",
  headline:
    "The practice OS for architects and designers who are tired of chasing their own record.",
  footerBlurb:
    "AORMS is the Architecture Office Resource Management System — built by Holagundi Consulting Works in Hospet, Karnataka, for Indian architectural and interior design consultancies.",
  canonical: "https://aorms.in/",
  siteName: "AORMS",
  wikiUrl: "https://wiki.aorms.in/",
} as const;

export const LANDING_FAQ = [
  {
    question: "Who is AORMS for?",
    answer:
      "Registered architects, interior designers and architectural consultancy practices in India — from solo studios to mid-sized firms. One standard licence with unlimited users.",
  },
  {
    question: "How much does AORMS cost?",
    answer:
      "Every new account includes 5 GB of cloud storage and the full workspace. You pay for additional storage (per GB-month) and for hosted AI usage, or bring your own OpenAI-compatible API key for Ask ESTI and AI Studio.",
  },
  {
    question: "Is there a desktop app to download?",
    answer:
      "No. AORMS runs entirely in the browser at aorms.in. Estimation, BOQ, drawings, finance, and portals are all inside the same cloud workspace.",
  },
  {
    question: "Where is the documentation?",
    answer:
      "The official AORMS Wiki at wiki.aorms.in covers getting started, workflows, estimation, finance, and account setup.",
  },
  {
    question: "Can I use my own AI API key?",
    answer:
      "Yes. In Company → AI you can set an OpenAI-compatible endpoint and API key. AORMS prefers your provider for better performance; hosted usage is not metered while BYO is active.",
  },
  {
    question: "What does AORMS help an architecture firm manage?",
    answer:
      "Client revisions, project phases, drawing transmittals and approvals, COA fee proposals, GST invoicing and reconciliation, consultant and contractor coordination, team workload, in-browser estimation, and ESTI AI-assisted office reasoning.",
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
        "@id": "https://wiki.aorms.in/#website",
        url: "https://wiki.aorms.in/",
        name: "AORMS Wiki",
        description: "Official documentation for the AORMS cloud workspace.",
        inLanguage: "en-IN",
        publisher: { "@id": "https://aorms.in/#organization" },
      },
      {
        "@type": "Organization",
        "@id": "https://aorms.in/#organization",
        name: "Holagundi Consulting Works",
        url: "https://aorms.in",
        email: "hi@aorms.in",
        telephone: "+91-8951089191",
        logo: "https://aorms.in/aorms-logo.png",
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
        name: "AORMS",
        alternateName: [
          "Architecture Office Resource Management System",
          "ESTI",
          "Embedded Studio Intelligence",
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: "https://aorms.in",
        description: LANDING_SEO.description,
        featureList:
          "project management, COA fee proposals, drawing transmittals, revision intelligence, GST billing, 26AS/AIS/GSTR reconciliation, HR and payroll, ASPRF team performance, client and consultant portals, Studio Intelligence, Ask ESTI, AI Studio, BYO AI API key, in-browser BOQ estimation",
        audience: {
          "@type": "Audience",
          audienceType: "Indian architects, interior designers and architectural consultancies",
        },
        offers: {
          "@type": "Offer",
          name: "AORMS Standard",
          description:
            "Full cloud workspace on signup with 5 GB storage included. Unlimited users, clients and projects. Additional storage and hosted AI metered; BYO API key supported.",
          price: "0",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: "https://aorms.in/#pricing",
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
