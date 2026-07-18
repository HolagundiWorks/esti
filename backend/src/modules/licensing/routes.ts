import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { env } from "../../env.js";
import { isRateLimited } from "../../lib/ratelimit.js";
import { LicenseAuthorityError, activateLicense, refreshLicense } from "./service.js";

/**
 * License authority REST surface (hub only). Nodes call these server-to-server
 * (no Origin header, like the AI gateway), before any tRPC session exists.
 * Registered as a no-op on `node` installs.
 */
export function registerLicenseRoutes(app: FastifyInstance): void {
  if (env.ESTI_ROLE !== "hub") return;

  app.post("/api/license/activate", async (req, reply) => {
    const body = (req.body ?? {}) as { key?: string; installId?: string; fingerprint?: string };
    if (!body.key || !body.installId) {
      return reply.code(400).send({ error: "key and installId are required" });
    }
    const key = body.key.trim();
    if (await isRateLimited("license-activate-ip", req.ip, 20, 300)) {
      return reply.code(429).send({ error: "too_many_requests" });
    }
    if (await isRateLimited("license-activate-key", key, 10, 3600)) {
      return reply.code(429).send({ error: "too_many_requests" });
    }
    try {
      const grant = await activateLicense(db, {
        key,
        installId: body.installId,
        fingerprint: body.fingerprint,
      });
      return reply.send(grant);
    } catch (e) {
      if (e instanceof LicenseAuthorityError) return reply.code(400).send({ error: e.message });
      throw e;
    }
  });

  app.post("/api/license/refresh", async (req, reply) => {
    const body = (req.body ?? {}) as { installId?: string; licenseToken?: string };
    if (!body.installId || !body.licenseToken) {
      return reply.code(400).send({ error: "installId and licenseToken are required" });
    }
    try {
      const res = await refreshLicense(db, {
        installId: body.installId,
        licenseToken: body.licenseToken,
      });
      return reply.send(res);
    } catch (e) {
      if (e instanceof LicenseAuthorityError) return reply.code(400).send({ error: e.message });
      throw e;
    }
  });
}
