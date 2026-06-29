/** Landing-page SEO copy — keep in sync with index.html meta tags. */
export const LANDING_SEO = {
  title: "AORMS | Architecture Office Management Software for Indian Architects",
  description:
    "AORMS helps Indian architecture firms manage client revisions, project workflows, fee proposals, approvals, billing, contractor coordination, and office operations in one platform.",
  keywords:
    "AORMS, architecture office management software, architecture practice management software, architecture firm management software, architecture consultancy management software, architecture ERP India, client revision management for architects, architecture project management software, architect fee proposal software, architect document approval system, GST billing and reconciliation for architects, consultant and contractor coordination software, ESTI AI assistant for architects",
  ogTitle: "AORMS — Architecture Office Resource Management System",
  ogDescription:
    "AORMS helps Indian architecture firms manage client revisions, project workflows, fee proposals, approvals, billing, contractor coordination and office operations.",
  twitterTitle: "AORMS — Architecture Office Management Software",
  twitterDescription:
    "Client revisions, project workflows, fee proposals, approvals, billing, contractor coordination and office operations for Indian architects.",
  headline: "The architecture office intelligence system.",
  footerBlurb:
    "AORMS is built by Holagundi Consulting Works in Hospet, Karnataka, for architecture practices that want their office to run with the same discipline as their drawings.",
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
