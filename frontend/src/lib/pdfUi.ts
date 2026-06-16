/** Poll interval for async PDF worker jobs (PENDING / PROCESSING). */
export function pdfPollInterval(
  pdfStatus: string | undefined,
  enabled = true,
): false | number {
  if (!enabled || !pdfStatus || pdfStatus === "NONE") return false;
  if (pdfStatus === "PENDING" || pdfStatus === "PROCESSING") return 1500;
  return false;
}

export type PdfUiState = "open" | "generating" | "retry" | "generate";

/** Pure UI state for document PDF action cells (Generate / Generating / Open / Retry). */
export function pdfUiState(pdfStatus: string, url: string | null): PdfUiState {
  if (pdfStatus === "READY" && url) return "open";
  if (pdfStatus === "PENDING" || pdfStatus === "PROCESSING") return "generating";
  if (pdfStatus === "FAILED") return "retry";
  return "generate";
}
