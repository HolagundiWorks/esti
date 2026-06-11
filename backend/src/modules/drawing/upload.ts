import { createHash } from "node:crypto";
import { DRAWING_MAX_BYTES, DrawingUploadFields } from "@esti/contracts";
import { eq, inArray, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { drawings, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
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
    const denial = uploadDenial(user);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

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
    const [project] = await db
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.id, parsed.data.projectId));
    if (!project) return reply.code(404).send({ error: "project not found" });
    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > DRAWING_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    // Content sniff: reject anything that isn't a real (ASCII or binary) DXF.
    if (!looksLikeDxf(fileBuf)) return reply.code(415).send({ error: "not a valid DXF file" });

    const fileHash = createHash("sha256").update(fileBuf).digest("hex");
    const storageKey = `dxf/${fileHash}.dxf`;
    await putObject(storageKey, fileBuf, "application/dxf");

    // Revision chaining: if rootId is given, supersede the current revision of
    // that drawing chain and bump the revision number.
    let revNo = 1;
    let rootId: string | null = null;
    if (parsed.data.rootId) {
      const [seed] = await db.select().from(drawings).where(eq(drawings.id, parsed.data.rootId));
      if (seed) {
        const chainRoot = seed.rootId ?? seed.id;
        const chain = await db
          .select()
          .from(drawings)
          .where(or(eq(drawings.id, chainRoot), eq(drawings.rootId, chainRoot)));
        revNo = Math.max(...chain.map((d) => d.revNo)) + 1;
        rootId = chainRoot;
        const currentIds = chain.filter((d) => d.isCurrent).map((d) => d.id);
        if (currentIds.length)
          await db.update(drawings).set({ isCurrent: false }).where(inArray(drawings.id, currentIds));
      }
    }

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
        revNo,
        rootId,
        revisionNote: parsed.data.revisionNote ?? null,
        isCurrent: true,
      })
      .returning();

    await enqueueJob("dxf_to_svg", {
      drawingId: row!.id,
      bucket: BUCKET,
      storageKey,
      fileHash,
    }, String(req.id));

    await writeAudit(db, {
      entity: "drawing",
      entityId: row!.id,
      action: rootId ? "UPLOAD_REVISION" : "UPLOAD",
      actorId: user!.id,
      after: { projectId: parsed.data.projectId, ref, fileHash, revNo, rootId },
    });

    return reply.code(201).send(row);
  });
}
