/**
 * Runtime API base URL.
 *
 * AORMS is web-only (2026-07-19): every call is same-origin and relative
 * (`/trpc`, `/upload/...`), served via Vite's dev proxy or Nginx, authenticated
 * with the session cookie. The former desktop (Tauri) bearer-token path was
 * removed with the desktop apps.
 */
export const API_BASE = "";

/** Prefix a server path with the runtime API base. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
