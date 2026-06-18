/** ESTICAD desktop deep-link protocol (see docs/esti/ESTICAD-COMPANION.md). */
export function esticadProjectUrl(projectId: string): string {
  return `esticad://project/${projectId}`;
}

export function esticadDrawingUrl(projectId: string, drawingId: string): string {
  return `esticad://project/${projectId}/drawing/${drawingId}`;
}

/** Open ESTICAD via custom URL scheme; falls back to copying the link. */
export function openEsticad(url: string): void {
  const w = window.open(url, "_blank");
  if (!w) {
    void navigator.clipboard?.writeText(url);
  }
}
