/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "ESTI — Practice Management for Indian Architects",
  description:
    "Stop managing your architecture practice on WhatsApp and spreadsheets. ESTI gives Indian architects a single place for projects, fee proposals, GST invoices, drawing registers, client portals, and building bylaw compliance — Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad. Solo to studio.",
  keywords:
    "architecture practice management India, Indian architect office software, COA fee proposal software, GST invoicing architects India, drawing register architecture, client portal architect, building compliance checker India, BBMP FAR calculator, FSI calculator India, self-hosted architecture software, ESTI, architectural office record, ESTICAD companion, GHMC building rules, DDA FAR, CMDA FSI Chennai, building bylaw checker",
  ogTitle: "Run your architecture practice, not your inbox",
  ogDescription:
    "From the first client call to the final GST invoice — projects, drawings, fees, and portals in one place. Walk through a live Bengaluru studio demo, no sign-up needed.",
  twitterTitle: "ESTI — for Indian architecture studios",
  twitterDescription:
    "Stop managing your practice on WhatsApp. Projects, drawings, GST invoices, client portals, and bylaw compliance for 8 Indian cities — in one place. Free live demo.",
  headline: "The office record your practice deserves.",
  footerBlurb:
    "Practice management for Indian architects — projects, fees, drawings, compliance, and client portals in one place.",
  canonical: "https://aorms.in/",
  siteName: "ESTI",
} as const;

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
