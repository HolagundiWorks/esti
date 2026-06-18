/** Deep-link protocol for ESTICAD desktop companion (Windows). */
export function esticadDrawingUrl(projectId: string, drawingId: string): string {
  return `esticad://project/${projectId}/drawing/${drawingId}`;
}

/** Open ESTICAD for takeoff on a linked drawing; returns false if the protocol handler is unavailable. */
export function openEsticadDrawing(projectId: string, drawingId: string): boolean {
  const url = esticadDrawingUrl(projectId, drawingId);
  try {
    window.location.assign(url);
    return true;
  } catch {
    return false;
  }
}

export const ESTICAD_DOWNLOAD_URL = "https://github.com/HolagundiWorks/esticad";
