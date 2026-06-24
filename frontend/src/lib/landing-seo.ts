/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "AORMS — Architecture Office Management Software for Indian Firms",
  description:
    "AORMS is AI-powered architecture office management software for Indian firms — projects, drawings, revisions, COA fees, GST invoicing, bylaw compliance, teams and client portals in one record. An office intelligence system that observes, predicts and recommends.",
  keywords:
    "architecture office management software, architecture firm management software, architecture practice management software, software for architecture firms, architecture project management software, architecture office intelligence system, AORMS, Indian architect office software, COA fee proposal software, GST invoicing architects India, drawing revision tracking software, architecture approval workflow software, building compliance checker India, BBMP FAR calculator, self-hosted architecture software, ESTICAD companion",
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
