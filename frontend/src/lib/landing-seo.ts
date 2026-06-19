/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "ESTI AORMS — Architectural Office Record for Indian Practices",
  description:
    "Self-hosted AORMS for Indian architects — traceable projects, CRIF revision control, COA fees, GST invoicing, drawing registers, ESTICAD desktop companion, client portals, and Knowledge Bank compliance. Solo to studio.",
  keywords:
    "AORMS, architectural office record, architecture practice management India, CRIF revision intelligence, COA scale of charges, GST invoicing architects, ESTICAD companion, client portal, self-hosted architecture software, ESTI AORMS",
  ogTitle: "One traceable office record for Indian architecture practices",
  ogDescription:
    "ESTI AORMS — projects, drawings, revisions, fees, and portals in one self-hosted system. Explore the live studio demo or ask ESTI on the landing page.",
  twitterTitle: "ESTI AORMS — Architecture Office Record",
  twitterDescription:
    "Traceable AORMS for Indian studios — CRIF, commercial, ESTICAD takeoff, and scoped portals. Self-hosted from solo to mid-size practice.",
  headline: "One traceable office record for Indian architecture practices",
  footerBlurb:
    "AORMS for Indian architecture practices — projects, fees, drawings, and accounts in one place, powered by ESTI.",
  canonical: "https://aorms.in/",
  siteName: "ESTI AORMS",
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
