/**
 * EOMS router — esti's read-only window onto the EOMS compliance Knowledge Bank.
 *
 * Every procedure returns the client's `EomsResult` envelope ({ ok, data } or
 * { ok:false, reason }) rather than throwing, so a compliance surface can render
 * an "EOMS not connected / offline" state instead of erroring. Reads are
 * reference lookups (codes & compliance), so `protectedProcedure` (any staff).
 */
import {
  EomsClauseInput,
  EomsLibraryInput,
  EomsResolveInput,
  EomsRulesInput,
} from "@esti/contracts";
import { z } from "zod";
import {
  eomsBundle,
  eomsClause,
  eomsEnabled,
  eomsHealth,
  eomsLibrary,
  eomsResolve,
  eomsRules,
  eomsSources,
  eomsVersions,
} from "../../lib/eoms/client.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const eomsRouter = router({
  /** Is the EOMS integration configured, and is the service reachable? */
  status: protectedProcedure.query(async () => {
    if (!eomsEnabled()) return { enabled: false as const, reachable: false as const };
    const h = await eomsHealth();
    return { enabled: true as const, reachable: h.ok, detail: h.ok ? h.data : h.message };
  }),

  /** Resolve the edition of a code in force (optionally as-of a date). */
  resolve: protectedProcedure
    .input(EomsResolveInput)
    .query(({ input }) => eomsResolve(input.source, input.asOf)),

  /** Filtered, machine-evaluable rules for a version. */
  rules: protectedProcedure.input(EomsRulesInput).query(({ input }) =>
    eomsRules(input.version, {
      param: input.param,
      exposure: input.exposure,
      material: input.material,
      structure_type: input.structureType,
      occupancy: input.occupancy,
      element: input.element,
    }),
  ),

  /** One structured clause. */
  clause: protectedProcedure
    .input(EomsClauseInput)
    .query(({ input }) => eomsClause(input.version, input.number)),

  /** The whole version bundle (for local caching / offline engines). */
  bundle: protectedProcedure
    .input(z.object({ version: z.string().min(1).max(160) }))
    .query(({ input }) => eomsBundle(input.version)),

  /** Catalog of sources. */
  sources: protectedProcedure.query(() => eomsSources()),

  /** Versions of a source (or all). */
  versions: protectedProcedure
    .input(z.object({ source: z.string().max(120).optional() }).optional())
    .query(({ input }) => eomsVersions(input?.source)),

  /** The ingestible-document library/catalog. */
  library: protectedProcedure
    .input(EomsLibraryInput.optional())
    .query(({ input }) => eomsLibrary(input ?? {})),
});
