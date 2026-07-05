/**
 * `.aormsest` import (binary REST, outside tRPC — same pattern as masterplan/
 * drawing uploads). Validates the interchange schema, verifies the seal when the
 * file carries a checksum, content-addresses the raw file, and inserts an
 * immutable estimate snapshot. Re-importing the same file just adds a new row.
 */
import { createHash } from "node:crypto";
import { extname } from "node:path";
import { ESTIMATE_EXTENSIONS, ESTIMATE_MAX_BYTES, EstimateFile, estimateSealString } from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { estimates } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";
import { putObject } from "../../lib/storage.js";

export function registerEstimateUpload(app: FastifyInstance): void {
  app.post("/upload/estimate", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/estimate"]);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    const fields: Record<string, string> = {};
    let fileBuf: Buffer | null = null;
    let fileName = "estimate.aormsest";
    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileName = part.filename || fileName;
        fileBuf = await part.toBuffer();
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }

    const pwDenial = await verifyUploadPassword(db, fields);
    if (pwDenial) return reply.code(pwDenial.status).send({ error: pwDenial.error });

    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > ESTIMATE_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    const ext = extname(fileName).toLowerCase();
    if (!ESTIMATE_EXTENSIONS.includes(ext as (typeof ESTIMATE_EXTENSIONS)[number])) {
      return reply.code(415).send({ error: `unsupported type ${ext}` });
    }

    let json: unknown;
    try {
      json = JSON.parse(fileBuf.toString("utf8"));
    } catch {
      return reply.code(400).send({ error: "not valid JSON" });
    }
    const parsed = EstimateFile.safeParse(json);
    if (!parsed.success) return reply.code(400).send({ error: "not a valid .aormsest file" });
    const file = parsed.data;

    // Seal check (only when the file declares a checksum).
    if (file.checksum) {
      const recomputed = createHash("sha256").update(estimateSealString(json as Record<string, unknown>)).digest("hex");
      if (recomputed !== file.checksum) return reply.code(400).send({ error: "checksum mismatch — file may be corrupt" });
    }

    const hash = createHash("sha256").update(fileBuf).digest("hex").slice(0, 32);
    const fileKey = `estimate/${hash}.aormsest`;
    await putObject(fileKey, fileBuf, "application/json");

    const title = (fields.title ?? "").trim() || file.meta.estimateName || fileName;
    const projectId = fields.projectId?.trim() || null;

    const [row] = await db
      .insert(estimates)
      .values({
        projectId,
        title,
        sourceRateBookCode: file.rateBook.code,
        sourceRateBookName: file.rateBook.name,
        sourceFileKey: fileKey,
        checksum: file.checksum ?? null,
        formatVersion: file.formatVersion,
        pack: file,
        uploadedById: user!.id,
      })
      .returning();
    await writeAudit(db, {
      entity: "estimate",
      entityId: row!.id,
      action: "IMPORT",
      actorId: user!.id,
      after: { title, items: file.items.length, checksum: file.checksum ?? null },
    });
    return reply.send({ ok: true, id: row!.id });
  });
}
