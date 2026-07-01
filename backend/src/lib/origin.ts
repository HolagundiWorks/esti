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

/** Browser unsafe requests must identify an explicitly trusted application origin. */
export function originDenial(
  method: string,
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): string | null {
  if (!UNSAFE_METHODS.has(method.toUpperCase())) return null;
  if (!origin) return "origin header required";
  const normalized = normalizeOrigin(origin);
  if (!normalized || !allowedOrigins.has(normalized)) return "origin not allowed";
  return null;
}
