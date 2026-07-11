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
 * The token is stored in the Tauri secrets dir (not localStorage).
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
let desktopTokenCache: string | null = null;
let desktopTokenReady = !IS_DESKTOP;

/** Load the desktop bearer token from secure storage (call once before auth fetch). */
export async function initDesktopAuth(): Promise<void> {
  if (!IS_DESKTOP || desktopTokenReady || typeof window === "undefined") return;
  desktopTokenReady = true;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const stored = (await invoke("load_session_token")) as string | null;
    desktopTokenCache = stored ?? null;
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (!desktopTokenCache && legacy) {
      desktopTokenCache = legacy;
      await invoke("store_session_token", { token: legacy });
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    desktopTokenCache = localStorage.getItem(TOKEN_KEY);
  }
}

export function getDesktopToken(): string | null {
  if (!IS_DESKTOP) return null;
  return desktopTokenCache;
}

export function setDesktopToken(token: string | null | undefined): void {
  if (!IS_DESKTOP || typeof window === "undefined") return;
  desktopTokenCache = token ?? null;
  void import("@tauri-apps/api/core")
    .then(({ invoke }) =>
      token ? invoke("store_session_token", { token }) : invoke("clear_session_token"),
    )
    .catch(() => {
      // Fail CLOSED (security audit S13 follow-up): if secure storage is
      // unavailable the token lives in memory only — the session lasts until
      // the app closes, and we never re-persist a plaintext token to
      // localStorage. Best-effort cleanup of any legacy copy.
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* storage unavailable — nothing to clean */
      }
    });
}

/** Authorization header for desktop bearer auth; empty on web. */
export function authHeaders(): Record<string, string> {
  const token = getDesktopToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
