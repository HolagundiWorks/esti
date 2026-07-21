/**
 * EOMS — Emergent Object Management System (the compliance Knowledge Bank).
 *
 * Typed mirror of the EOMS local REST/JSON contract (FastAPI, default
 * `http://127.0.0.1:8756`). EOMS is a *separate* service/repo
 * (github.com/HolagundiWorks/eoms); esti consumes it read-only, server-to-server.
 * Schemas are `.passthrough()` so EOMS can add fields without breaking esti.
 *
 * See docs/esti/EOMS-INTEGRATION.md and docs/esti/EOMS-ARCHITECTURE.md.
 */
import { z } from "zod";

/** Applicability tag — which conditions a rule applies under. */
export const EomsApplicability = z
  .object({ dimension: z.string(), value: z.string() })
  .passthrough();
export type EomsApplicability = z.infer<typeof EomsApplicability>;

/** Where a rule came from (audit) — document + page + extraction confidence. */
export const EomsProvenance = z
  .object({
    document: z.string(),
    page: z.number().int().nullable().optional(),
    confidence: z.number().default(0),
    method: z.enum(["llama", "heuristic", "manual"]).default("llama"),
  })
  .passthrough();
export type EomsProvenance = z.infer<typeof EomsProvenance>;

/** A machine-evaluable rule extracted from a clause. condition/effect stay loose. */
export const EomsRule = z
  .object({
    id: z.string(),
    clause_id: z.string(),
    type: z.enum(["limit", "requirement", "ratio", "option", "definition", "rate"]).default("requirement"),
    severity: z.enum(["mandatory", "recommended"]).default("mandatory"),
    condition: z.record(z.string(), z.unknown()).nullable().optional(),
    effect: z.record(z.string(), z.unknown()).nullable().optional(),
    text: z.string().nullable().optional(),
    applicability: z.array(EomsApplicability).default([]),
    provenance: EomsProvenance.nullable().optional(),
  })
  .passthrough();
export type EomsRule = z.infer<typeof EomsRule>;

/** A clause of a code/version — verbatim text kept for audit, rules for engines. */
export const EomsClause = z
  .object({
    id: z.string(), // URN, e.g. is:456:2000:cl:26.4.2
    version_id: z.string(),
    number: z.string(),
    heading: z.string().nullable().optional(),
    source_text: z.string().default(""),
    ordinal: z.number().int().default(0),
    rules: z.array(EomsRule).default([]),
    cross_references: z.array(z.string()).default([]),
  })
  .passthrough();
export type EomsClause = z.infer<typeof EomsClause>;

/** An edition of a source — the thing you pin/resolve to; `status` gates serving. */
export const EomsVersion = z
  .object({
    id: z.string(), // e.g. is:456:2000
    source_id: z.string(),
    edition: z.string(),
    effective_from: z.string().nullable().optional(),
    effective_to: z.string().nullable().optional(),
    status: z.enum(["draft", "published", "superseded"]).default("draft"),
  })
  .passthrough();
export type EomsVersion = z.infer<typeof EomsVersion>;

/** A code/standard/book in the bank. */
export const EomsSource = z
  .object({
    id: z.string(), // e.g. is:456
    kind: z.enum(["is_code", "nbc", "bylaw", "book"]).default("book"),
    title: z.string(),
    authority: z.string().nullable().optional(),
  })
  .passthrough();
export type EomsSource = z.infer<typeof EomsSource>;

/** `GET /v1/rules` envelope. */
export const EomsRulesResponse = z
  .object({
    version_id: z.string(),
    count: z.number().int(),
    filters: z.record(z.string(), z.string()).default({}),
    results: z.array(EomsRule).default([]),
  })
  .passthrough();
export type EomsRulesResponse = z.infer<typeof EomsRulesResponse>;

/** `GET /v1/versions/{id}/bundle` envelope. */
export const EomsBundleResponse = z
  .object({
    version_id: z.string(),
    count: z.number().int(),
    clauses: z.array(EomsClause).default([]),
  })
  .passthrough();
export type EomsBundleResponse = z.infer<typeof EomsBundleResponse>;

/** A catalog/library entry — a document that can be ingested. */
export const EomsLibraryDoc = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    category: z.string().nullable().optional(),
    jurisdiction: z.string().nullable().optional(),
    access: z.string().nullable().optional(),
  })
  .passthrough();
export type EomsLibraryDoc = z.infer<typeof EomsLibraryDoc>;

// ── esti-side request inputs (tRPC) ──────────────────────────────────────────

export const EomsResolveInput = z.object({
  /** URN source id, e.g. "is:456" or "nbc:2016". */
  source: z.string().min(1).max(120),
  /** Edition-in-force as of this date (YYYY-MM-DD); omit for latest. */
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type EomsResolveInput = z.infer<typeof EomsResolveInput>;

export const EomsRulesInput = z.object({
  /** URN version id, e.g. "is:456:2000". */
  version: z.string().min(1).max(160),
  param: z.string().max(120).optional(),
  exposure: z.string().max(120).optional(),
  material: z.string().max(120).optional(),
  structureType: z.string().max(120).optional(),
  occupancy: z.string().max(120).optional(),
  element: z.string().max(120).optional(),
});
export type EomsRulesInput = z.infer<typeof EomsRulesInput>;

export const EomsClauseInput = z.object({
  version: z.string().min(1).max(160),
  number: z.string().min(1).max(60),
});
export type EomsClauseInput = z.infer<typeof EomsClauseInput>;

export const EomsLibraryInput = z.object({
  category: z.string().max(120).optional(),
  jurisdiction: z.string().max(120).optional(),
  access: z.enum(["free", "purchase"]).optional(),
  q: z.string().max(200).optional(),
});
export type EomsLibraryInput = z.infer<typeof EomsLibraryInput>;
