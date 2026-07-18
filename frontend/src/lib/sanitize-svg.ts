import DOMPurify from "dompurify";

/** Sanitize server-provided SVG before injecting into the DOM. */
export function sanitizeSvgMarkup(svg: string): string {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
