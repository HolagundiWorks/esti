/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "AORMS | India's Standardized Operational Framework for Architectural Consultancy Practices",
  description:
    "AORMS is India's first standardized operational framework for managing architectural consultancy practices — client revisions, project workflows, fee proposals, drawing approvals, GST billing and reconciliation, consultant and contractor coordination, and team performance, in one system.",
  keywords:
    "AORMS, architectural consultancy management software, architectural practice management software, architecture practice management software, architecture firm management software, architecture office management software, architecture ERP India, client revision management for architects, architecture project management software, architect fee proposal software, architect document approval system, GST billing and reconciliation for architects, consultant and contractor coordination software, ESTI AI assistant for architects",
  ogTitle: "AORMS — India's First Operational Framework for Architectural Consultancy Practices",
  ogDescription:
    "AORMS is India's first standardized operational framework for managing architectural consultancy practices — client revisions, projects, fee proposals, drawing approvals, GST billing and reconciliation, and consultant and contractor coordination.",
  twitterTitle: "AORMS — India's Framework for Architectural Consultancies",
  twitterDescription:
    "India's first standardized operational framework for architectural consultancy practices — client revisions, projects, fee proposals, approvals, GST billing and reconciliation, and team performance.",
  headline: "India's first standardized operational framework for managing architectural consultancy practices.",
  footerBlurb:
    "AORMS is India's first standardized operational framework for managing architectural consultancy practices — built by Holagundi Consulting Works in Hospet, Karnataka, for offices that want to run with the same discipline as their drawings.",
  canonical: "https://aorms.in/",
  siteName: "AORMS",
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
