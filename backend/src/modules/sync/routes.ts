import { SyncIngestBody } from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { env } from "../../env.js";
import { firmFromSyncToken, ingestRecord } from "./service.js";

/**
 * Hub-side sync ingest (hub only). A node POSTs finalized records here with its
 * sync bearer; the hub resolves the firm and upserts the per-firm record store.
 * No-op on `node` installs.
 */
export function registerSyncRoutes(app: FastifyInstance): void {
  if (env.ESTI_ROLE !== "hub") return;

  app.post("/api/sync/ingest", async (req, reply) => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
    const firmId = await firmFromSyncToken(db, bearer);
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });

    const parsed = SyncIngestBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid sync body" });

    const remoteId = await ingestRecord(db, firmId, parsed.data);
    return reply.send({ remoteId });
  });
}
