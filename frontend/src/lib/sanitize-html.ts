import DOMPurify from "dompurify";

/** Sanitize markdown-rendered HTML before injecting into the DOM. */
export function sanitizeMarkdownHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
