/**
 * Canonical, deterministic pack sealing. Pure and dependency-free (node:crypto
 * only) so both the pipeline (which builds packs) and the pack tests (which
 * verify them without the workspace installed) share one source of truth.
 *
 * The checksum is content-addressed over a KEY-SORTED serialization, so it does
 * not depend on object key order (zod re-orders keys on .parse) — the same pack
 * content always yields the same seal, whoever assembled it.
 */
import { createHash } from "node:crypto";

/** Key-sorted JSON. `undefined` values are dropped (as JSON.stringify does). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

/** Pretty, key-sorted JSON for the committed pack file (stable diffs). */
export function stablePretty(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) {
      if (src[k] !== undefined) out[k] = sortKeys(src[k]);
    }
    return out;
  }
  return v;
}

/** sha256 of the pack content with any existing `checksum` field excluded. */
export function packChecksum(pack: Record<string, unknown>): string {
  const { checksum: _drop, ...rest } = pack;
  void _drop;
  return createHash("sha256").update(stableStringify(rest)).digest("hex");
}
