/** Landing-page SEO — keep in sync with index.html meta tags and JSON-LD. */
export const LANDING_SEO = {
  title: "AORMS | Practice management software for architects & designers in India",
  description:
    "AORMS is the cloud practice OS for Indian architects and interior designers — fee recovery, MoM-led client revisions, GST billing, drawings, studio load and portals. Unlimited users. 5 GB included.",
  keywords:
    "architecture practice management software India, fee recovery architects, architect fee proposal software COA, GST billing architects India, client revision management architects, minutes of meeting architects, MoM revision workflow, drawing approval software, architecture project management, ESTI AI architect assistant, AORMS cloud workspace",
  ogTitle: "AORMS — Practice OS for architects & designers",
  ogDescription:
    "One cloud workspace for Indian architectural studios: fee recovery, MoM-to-site revisions, GST, drawings, studio load and portals. Unlimited users. 5 GB included.",
  twitterTitle: "AORMS — from chaos to clarity",
  twitterDescription:
    "Fees, MoM-led revisions, GST and studio load in one browser workspace. Built for Indian architects. Unlimited users · 5 GB included.",
  headline:
    "From chaos to clarity. One living record for the practice.",
  footerBlurb:
    "AORMS is the Architecture Office Resource Management System — built by Holagundi Consulting Works in Hospet, Karnataka, for Indian architectural and interior design consultancies. Fee recovery and MoM-led revisions on one living record.",
  canonical: "https://aorms.in/",
  siteName: "AORMS",
  wikiUrl: "https://aorms.in/wiki",
} as const;

export const LANDING_FAQ = [
  {
    question: "Who is AORMS for?",
    answer:
      "Registered architects, interior designers and architectural consultancy practices in India — from solo studios to mid-sized firms. One standard licence with unlimited users.",
  },
  {
    question: "How does fee recovery work?",
    answer:
      "AORMS shows what is ready to invoice, the next COA payment stage, incoming receipts and due dates on the project record. GST invoices and filing reminders stay on the same trail — so money tracking is not a side spreadsheet.",
  },
  {
    question: "How much does AORMS cost?",
    answer:
      "Every new account includes 5 GB of cloud storage and the full workspace. You pay for additional storage (per GB-month) and for hosted AI usage, or bring your own OpenAI-compatible API key for Ask ESTI and AI Studio.",
  },
  {
    question: "Is there a desktop app to download?",
    answer:
      "No. AORMS runs entirely in the browser at aorms.in. Drawings, finance, portals and studio intelligence are all inside the same cloud workspace.",
  },
  {
    question: "Where is the documentation?",
    answer:
      "The official AORMS Wiki at aorms.in/wiki covers getting started, workflows, finance, and account setup.",
  },
  {
    question: "How does client revision management work?",
    answer:
      "The client schedules a meeting; discussion becomes minutes of meeting. ESTI extracts implied revisions and the client submits a revision request. The architect marks criticality and implications, the client approves — then changes proceed on drawings and site with a dated trail.",
  },
  {
    question: "Can I use my own AI API key?",
    answer:
      "Yes. In Company → AI you can set an OpenAI-compatible endpoint and API key. AORMS prefers your provider for better performance; hosted usage is not metered while BYO is active. ESTI also extracts revision items from minutes of meeting.",
  },
  {
    question: "What does AORMS help an architecture firm manage?",
    answer:
      "Fee recovery (invoice-ready work, payment stages, receipts, due dates), MoM-led client revisions, project phases, drawing transmittals and approvals, COA fee proposals, GST invoicing and reconciliation, consultant and contractor coordination, studio load, and ESTI AI-assisted office reasoning.",
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
          "fee recovery, invoice-ready work, COA payment stages, GST billing, due-date reminders, minutes of meeting, ESTI revision extraction, client revision approval, drawing transmittals, studio load, client and consultant portals, Studio Intelligence, Ask ESTI, AI Studio, BYO AI API key",
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
