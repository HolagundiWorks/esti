import { createHash } from "node:crypto";
import { DRAWING_MAX_BYTES, DrawingUploadFields } from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { db } from "../../db/index.js";
import { drawings } from "../../db/schema.js";
import { looksLikeDxf } from "../../lib/filetype.js";
import { enqueueJob } from "../../lib/redis.js";
import { nextRef } from "../../lib/numbering.js";
import { BUCKET, putObject } from "../../lib/storage.js";

/**
 * Binary upload lives outside tRPC (which is JSON-only). The DXF is stored
 * content-addressed in object storage, a drawing row is created PENDING, and a
 * dxf_to_svg job is enqueued for the Python worker.
 */
export function registerDrawingUpload(app: FastifyInstance): void {
  app.post("/upload/drawing", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    const user = await userFromToken(token);
    if (!user) return reply.code(401).send({ error: "unauthenticated" });

    const fields: Record<string, string> = {};
    let fileBuf: Buffer | null = null;
    let fileName = "drawing.dxf";

    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileName = part.filename || fileName;
        fileBuf = await part.toBuffer();
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }

    const parsed = DrawingUploadFields.safeParse(fields);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > DRAWING_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    // Content sniff: reject anything that isn't a real (ASCII or binary) DXF.
    if (!looksLikeDxf(fileBuf)) return reply.code(415).send({ error: "not a valid DXF file" });

    const fileHash = createHash("sha256").update(fileBuf).digest("hex");
    const storageKey = `dxf/${fileHash}.dxf`;
    await putObject(storageKey, fileBuf, "application/dxf");

    const { ref } = await nextRef(db, "drawing", "DRW");
    const [row] = await db
      .insert(drawings)
      .values({
        ref,
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        fileName,
        fileHash,
        storageKey,
        sizeBytes: fileBuf.length,
        status: "PENDING",
      })
      .returning();

    await enqueueJob("dxf_to_svg", {
      drawingId: row!.id,
      bucket: BUCKET,
      storageKey,
      fileHash,
    });

    return reply.code(201).send(row);
  });
}
