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
