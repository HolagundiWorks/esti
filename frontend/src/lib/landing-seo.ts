/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "AORMS — Architecture Office Management Software for Indian Firms",
  description:
    "AORMS — architecture office management software for Indian firms. Free AORMS-Lite for solo studios below the GST threshold (3 team, 10 clients, 10 contractors) — drawings, simple non-GST invoices, bank reconciliation; paid AORMS-Core adds construction/PMC, tenders, GST invoicing, 26AS/GSTR reconciliation & filing, HR, AI; AORMS-Enterprise deploys on your infrastructure.",
  keywords:
    "AORMS Lite free, free architecture software India, architecture office management software, architecture firm management software, architecture practice management software, software for architecture firms, architecture project management software, AORMS, Indian architect office software, COA fee proposal software, GST invoicing architects India, drawing revision tracking software, architecture approval workflow software, on-premises architecture software, BOQ rate analysis running bills, ESTICAD companion, AORMS Core pricing, AORMS Enterprise on-premises",
  ogTitle: "A digital nervous system for architecture firms",
  ogDescription:
    "AORMS observes your office, reasons through client/project/finance/team pressure, predicts risk, and recommends interventions before failure matures.",
  twitterTitle: "AORMS — office cognition for architects",
  twitterDescription:
    "A digital nervous system for Indian architecture firms: observe, reason, predict, recommend, explain.",
  headline: "The architecture office intelligence system.",
  footerBlurb:
    "Continuous organizational cognition for architecture firms — projects, billing, approvals, revisions, compliance, and team load understood as one operating system.",
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
