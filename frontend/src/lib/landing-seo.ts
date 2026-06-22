/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "AORMS — Architecture Office Intelligence System",
  description:
    "AORMS is a continuous office cognition engine for Indian architecture firms. It observes projects, approvals, billing, revisions, compliance, and team load, then reasons, predicts, recommends interventions, and explains findings through a guarded AI layer.",
  keywords:
    "architecture office intelligence system, AORMS, architecture operations intelligence, Indian architect office software, AI dashboard for architects, office cognition engine, COA fee proposal software, GST invoicing architects India, drawing register architecture, client portal architect, building compliance checker India, BBMP FAR calculator, self-hosted architecture software, ESTICAD companion",
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
