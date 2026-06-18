let seq = 0;

/**
 * Correlation id for tRPC batches (x-request-id header).
 * Do not use crypto.randomUUID() — it is missing or throws on plain HTTP
 * (non-secure context) and breaks every API call including login.
 */
export function newRequestId(): string {
  seq = (seq + 1) % 1_000_000;
  return `r${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
