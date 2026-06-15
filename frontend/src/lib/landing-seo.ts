/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "ESTI AORMS — Architectural Studio Management Software for Indian Architects",
  description:
    "Architectural studio management software for Indian architects — COA fee proposals, GST & TDS invoicing, drawings, RIE bylaw compliance, BBS and client portals. Self-hosted AORMS for solo practitioners and architecture studios.",
  keywords:
    "architectural studio management software, architecture studio management software India, client revision management architects, Major Critical revision workflow, ASPRF performance scoring, architectural office management software, practice management software for architects India, AORMS, ESTI AORMS, COA scale of charges, GST invoicing architects, TDS 194J, FAR setback compliance, BBS software, self-hosted architecture software",
  ogTitle: "Architectural Studio Management Software for Indian Architects",
  ogDescription:
    "ESTI AORMS — self-hosted studio management for Indian architecture practices. Projects, COA fees, drawings, compliance and GST in one traceable office record.",
  twitterTitle: "Architectural Studio Management Software for Indian Architects | ESTI AORMS",
  twitterDescription:
    "Self-hosted AORMS for Indian architects and studios — fees, drawings, bylaws, BBS and GST billing in one system.",
  headline: "Architectural Studio Management Software for Indian Architects",
  footerBlurb:
    "ESTI — Embedded Studio Intelligence — powers AORMS, the Architectural Office Resource Management System for Indian architects and architecture studios.",
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
