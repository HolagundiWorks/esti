/**
 * Markdown normalisation — pure, dependency-free so the pipeline and the pack
 * tests share one definition (a source markdown normalises identically wherever
 * it is processed). Strips page furniture and collapses blank runs before the
 * deterministic parser sees it.
 */
export function formatMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/^\s*Page \d+ of \d+\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
