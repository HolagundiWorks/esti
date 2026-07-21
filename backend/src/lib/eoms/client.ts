/**
 * EOMS client — esti's read-only, server-to-server connection to the EOMS
 * compliance Knowledge Bank (a separate local service; github.com/HolagundiWorks/eoms).
 *
 * Design notes:
 * - EOMS is optional and lives out-of-process (the desktop companion, default
 *   :8756). It may be offline, so every call **degrades gracefully** — it returns
 *   a typed result, never throws, so a compliance screen renders "EOMS not
 *   connected" instead of erroring.
 * - Only the **published** serving state is requested (draft/unreviewed rules are
 *   never surfaced) — matching EOMS's human-in-the-loop gate.
 * - Immutable responses (clause, bundle, published version) are cached briefly.
 */
import {
  EomsBundleResponse,
  EomsClause,
  EomsRulesResponse,
  EomsSource,
  EomsVersion,
  type EomsLibraryDoc,
  EomsLibraryDoc as EomsLibraryDocSchema,
} from "@esti/contracts";
import { z } from "zod";
import { env } from "../../env.js";

export type EomsFailure =
  | { ok: false; reason: "disabled"; message: string }
  | { ok: false; reason: "unreachable"; message: string }
  | { ok: false; reason: "not_found"; message: string }
  | { ok: false; reason: "bad_response"; message: string };
export type EomsResult<T> = { ok: true; data: T } | EomsFailure;

const TIMEOUT_MS = 8000;

/** Whether the EOMS integration is configured. */
export const eomsEnabled = (): boolean => env.EOMS_API_URL.trim().length > 0;
const baseUrl = (): string => env.EOMS_API_URL.trim().replace(/\/+$/, "");

// Tiny in-process TTL cache — EOMS serving responses are immutable per version.
const cache = new Map<string, { at: number; value: unknown }>();
const now = () => Date.now();

async function eomsGet<S extends z.ZodTypeAny>(
  path: string,
  query: Record<string, string | undefined>,
  schema: S,
  cacheTtlMs: number,
): Promise<EomsResult<z.infer<S>>> {
  type T = z.infer<S>;
  if (!eomsEnabled())
    return { ok: false, reason: "disabled", message: "EOMS_API_URL is not set." };

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, v);
  const url = `${baseUrl()}${path}${qs.toString() ? `?${qs}` : ""}`;

  const cached = cache.get(url);
  if (cached && now() - cached.at < cacheTtlMs) return { ok: true, data: cached.value as T };

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // Connection refused / DNS / timeout — EOMS is not running or not reachable.
    return { ok: false, reason: "unreachable", message: `EOMS unreachable: ${(e as Error).message}` };
  }
  if (res.status === 404)
    return { ok: false, reason: "not_found", message: `Not found: ${path}` };
  if (!res.ok)
    return { ok: false, reason: "unreachable", message: `EOMS HTTP ${res.status}` };

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: "bad_response", message: "EOMS returned non-JSON." };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    return { ok: false, reason: "bad_response", message: "EOMS response failed validation." };

  cache.set(url, { at: now(), value: parsed.data });
  return { ok: true, data: parsed.data };
}

/** Liveness — is EOMS reachable? (short cache) */
export async function eomsHealth(): Promise<EomsResult<{ status: string }>> {
  return eomsGet("/health", {}, z.object({ status: z.string() }).passthrough(), 5_000);
}

/** Resolve the edition of a source in force (optionally as-of a date). Published only. */
export async function eomsResolve(source: string, asOf?: string): Promise<EomsResult<EomsVersion>> {
  return eomsGet("/v1/resolve", { source, as_of: asOf, status: "published" }, EomsVersion, 60_000);
}

/** Filtered, ready-to-evaluate rules for a version. Published only. */
export async function eomsRules(
  version: string,
  filters: { param?: string; exposure?: string; material?: string; structure_type?: string; occupancy?: string; element?: string } = {},
): Promise<EomsResult<EomsRulesResponse>> {
  return eomsGet(
    "/v1/rules",
    { version, status: "published", ...filters },
    EomsRulesResponse,
    5 * 60_000,
  );
}

/** One structured clause of a version (immutable — long cache). */
export async function eomsClause(version: string, number: string): Promise<EomsResult<EomsClause>> {
  return eomsGet(`/v1/versions/${encodeURIComponent(version)}/clauses/${encodeURIComponent(number)}`, {}, EomsClause, 30 * 60_000);
}

/** The whole version bundle (for local caching by an engine). */
export async function eomsBundle(version: string): Promise<EomsResult<EomsBundleResponse>> {
  return eomsGet(`/v1/versions/${encodeURIComponent(version)}/bundle`, {}, EomsBundleResponse, 30 * 60_000);
}

/** Catalog of sources. */
export async function eomsSources(): Promise<EomsResult<EomsSource[]>> {
  return eomsGet("/v1/sources", {}, z.array(EomsSource), 5 * 60_000);
}

/** Versions of a source. */
export async function eomsVersions(source?: string): Promise<EomsResult<EomsVersion[]>> {
  return eomsGet("/v1/versions", { source }, z.array(EomsVersion), 5 * 60_000);
}

/** The ingestible-document library/catalog. */
export async function eomsLibrary(
  filters: { category?: string; jurisdiction?: string; access?: string; q?: string } = {},
): Promise<EomsResult<EomsLibraryDoc[]>> {
  return eomsGet("/v1/library", filters, z.array(EomsLibraryDocSchema), 10 * 60_000);
}
