import { computeBylawEnvelope, BylawCalcInput } from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { loadActiveBbmpRuleCatalog } from "../../lib/bbmpRules.js";
import { CITY_REGS, getCityById } from "./cityData.js";

/**
 * Public (no-auth) compliance REST API.
 * CORS is open for all origins — registered in index.ts which bypasses the
 * per-origin check for /api/compliance/* paths.
 *
 * Rate limit: 30 req/min per IP (override of the global 600/min).
 *
 * Endpoints:
 *   GET  /api/compliance/authorities          — legacy: BBMP authority list
 *   GET  /api/compliance/cities               — all cities with reference data
 *   GET  /api/compliance/cities/:cityId       — single city DCR reference
 *   POST /api/compliance/check                — BBMP compute (full engine)
 */
export function registerComplianceApi(app: FastifyInstance) {
  // Legacy: kept for backwards-compat with existing embeds
  app.get("/api/compliance/authorities", async () => ({
    apiVersion: "1",
    authorities: [
      {
        id: "bbmp-bengaluru",
        label: "BBMP Building Bye-Laws 2003",
        jurisdiction: "Bengaluru, Karnataka, India",
        description:
          "Bruhat Bengaluru Mahanagara Palike development control regulations. " +
          "Full engine: FAR, ground coverage, setbacks, parking, height, and sustainability.",
      },
    ],
    cities: CITY_REGS.map((c) => ({
      id: c.id,
      city: c.city,
      state: c.state,
      authority: c.authority,
      regulation: c.regulation,
      year: c.year,
      status: c.status,
    })),
  }));

  // All cities — summary list
  app.get("/api/compliance/cities", async () => ({
    apiVersion: "1",
    cities: CITY_REGS.map((c) => ({
      id: c.id,
      city: c.city,
      state: c.state,
      authority: c.authority,
      regulation: c.regulation,
      year: c.year,
      status: c.status,
      source: c.source,
    })),
  }));

  // Single city — full reference data
  app.get<{ Params: { cityId: string } }>(
    "/api/compliance/cities/:cityId",
    async (req, reply) => {
      const city = getCityById(req.params.cityId);
      if (!city) {
        return reply.code(404).send({ error: "City not found", cityId: req.params.cityId });
      }
      return { apiVersion: "1", data: city };
    },
  );

  // BBMP compute — full engine
  app.post<{ Body: unknown }>(
    "/api/compliance/check",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = BylawCalcInput.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "Invalid input", issues: parsed.error.issues });
      }
      const catalog = await loadActiveBbmpRuleCatalog(db);
      const result = computeBylawEnvelope(parsed.data, catalog);
      return {
        apiVersion: "1",
        authority: "bbmp-bengaluru",
        ruleSet: {
          id: catalog.ruleSetId ?? null,
          label: catalog.label ?? "BBMP Building Bye-Laws 2003",
        },
        input: parsed.data,
        result,
      };
    },
  );
}
