/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "ESTI AORMS — Architectural Studio Management Software for Indian Architects",
  description:
    "Practice management for Indian architects — COA fee proposals, drawing issue registers, client revision control, RIE bylaw compliance, GST & TDS invoicing, BBS, ESTICAD desktop companion for cloud takeoff, and consultant portals. Self-hosted AORMS from solo consultancy to design studio.",
  keywords:
    "architectural practice management software, architecture studio software India, ESTICAD, desktop CAD companion, cloud takeoff, client instruction register, Major Critical revision workflow, drawing issue control, ASPRF performance scoring, COA scale of charges, GST invoicing architects, TDS 194J, RIE FAR setback compliance, BBS software, self-hosted architecture software, AORMS, ESTI AORMS",
  ogTitle: "Practice Management Software for Indian Architects",
  ogDescription:
    "ESTI AORMS — self-hosted practice management from briefing to final bill. Projects, COA fees, drawing issues, RIE compliance, ESTICAD cloud takeoff and GST in one office record.",
  twitterTitle: "Practice Management for Indian Architects | ESTI AORMS",
  twitterDescription:
    "Self-hosted AORMS for Indian architecture practices — staged fees, drawing registers, bylaws, ESTICAD companion, BBS and GST billing in one system.",
  headline: "Practice Management Software for Indian Architects",
  footerBlurb:
    "ESTI — Embedded Studio Intelligence — powers AORMS, the practice management system for Indian architects and architecture studios.",
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
