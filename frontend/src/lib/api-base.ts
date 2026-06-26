/**
 * Runtime API base URL + desktop auth.
 *
 * Web / VPS: `API_BASE` is "" so every call stays same-origin and relative
 * (`/trpc`, `/upload/...`) — exactly the existing behavior, served via Vite's dev
 * proxy or Nginx. Cookie auth is used.
 *
 * Desktop (Tauri): the shell injects `window.__ESTI__ = { apiBase }` before the
 * SPA loads, pointing at the loopback backend (`http://127.0.0.1:<port>`). Because
 * the webview origin (`tauri://localhost`) is cross-origin to the backend,
 * SameSite cookies aren't sent — so the desktop build authenticates with the
 * session token returned by login, attached as an `Authorization: Bearer` header.
 */
declare global {
  interface Window {
    __ESTI__?: { apiBase: string };
  }
}

const injected = typeof window !== "undefined" ? window.__ESTI__ : undefined;

export const IS_DESKTOP = !!injected;
export const API_BASE = injected?.apiBase ?? "";

/** Prefix a server path with the runtime API base (no-op on web). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

const TOKEN_KEY = "esti.desktop.token";

export function getDesktopToken(): string | null {
  if (!IS_DESKTOP || typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setDesktopToken(token: string | null | undefined): void {
  if (!IS_DESKTOP || typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Authorization header for desktop bearer auth; empty on web. */
export function authHeaders(): Record<string, string> {
  const token = getDesktopToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
