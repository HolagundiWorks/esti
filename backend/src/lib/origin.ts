const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function parseAllowedOrigins(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((item) => normalizeOrigin(item.trim()))
      .filter((item): item is string => item !== null),
  );
}

/** If the request Origin is trusted, return it verbatim (to reflect back as
 *  `Access-Control-Allow-Origin`); otherwise null. Needed for the desktop webview
 *  (`tauri://localhost`), which is cross-origin to the loopback backend. */
export function corsAllowOrigin(
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): string | null {
  if (!origin) return null;
  const normalized = normalizeOrigin(origin);
  return normalized && allowedOrigins.has(normalized) ? origin : null;
}

/**
 * Browser unsafe requests must identify an explicitly trusted application origin.
 *
 * This is CSRF protection for **cookie**-authenticated requests. Server-to-server
 * machine calls — a firm node hitting `/platform/v1/*`, or `/api/sync/ingest` —
 * authenticate by bearer token and send no Origin at all, so they would
 * otherwise be 403'd. `hasAuthorization` exempts them.
 *
 * The caller decides when to pass it, and must grant it only on those
 * token-authenticated routes (see `isMachineAuthRoute` in index.ts). Passing it
 * for any request that merely carries an `Authorization` header would let a
 * stray header disable CSRF protection on cookie-authenticated routes.
 */
/**
 * Routes that authenticate by bearer token rather than a session cookie, and so
 * legitimately arrive from server-to-server callers with no Origin header:
 * `/platform/v1/*` (licence activation/validation from a firm node) and
 * `/api/sync/ingest` (hub installs only).
 *
 * Only these may claim the `hasAuthorization` exemption. Granting it to any
 * request that merely carries an `Authorization` header would let a stray
 * header switch off CSRF protection on cookie-authenticated routes.
 */
export function isMachineAuthRoute(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return path.startsWith("/platform/v1/") || path.startsWith("/api/sync/");
}

export function originDenial(
  method: string,
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
  hasAuthorization = false,
): string | null {
  if (!UNSAFE_METHODS.has(method.toUpperCase())) return null;
  if (hasAuthorization) return null;
  if (!origin) return "origin header required";
  const normalized = normalizeOrigin(origin);
  if (!normalized || !allowedOrigins.has(normalized)) return "origin not allowed";
  return null;
}
