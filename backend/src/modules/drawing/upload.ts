import { createHash } from "node:crypto";
import { DRAWING_MAX_BYTES, DrawingUploadFields } from "@esti/contracts";
import { eq, inArray, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { drawings, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";
import { writeActivity } from "../../lib/activity.js";
import { looksLikeDwg, looksLikeDxf, looksLikePdf } from "../../lib/filetype.js";
import { enqueueJob } from "../../lib/redis.js";
import { nextRef } from "../../lib/numbering.js";
import { BUCKET, putObject } from "../../lib/storage.js";

/**
 * Binary upload lives outside tRPC (which is JSON-only).
 * - DXF → content-addressed storage, PENDING, enqueue dxf_to_svg.
 * - PDF → content-addressed storage, READY immediately (Plan Measurement uses PDF.js).
 */
export function registerDrawingUpload(app: FastifyInstance): void {
  app.post("/upload/drawing", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    const user = await userFromToken(token);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/drawing"]);
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

    const passwordDenial = await verifyUploadPassword(db, fields);
    if (passwordDenial) return reply.code(passwordDenial.status).send({ error: passwordDenial.error });

    const [project] = await db
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.id, parsed.data.projectId));
    if (!project) return reply.code(404).send({ error: "project not found" });
    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > DRAWING_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    if (looksLikeDwg(fileBuf)) {
      return reply.code(415).send({
        error: "DWG is not supported — use Save As / Export to DXF (.dxf) from your CAD tool, or upload a PDF plan",
      });
    }

    const isPdf = looksLikePdf(fileBuf);
    const isDxf = !isPdf && looksLikeDxf(fileBuf);
    if (!isPdf && !isDxf) {
      return reply.code(415).send({
        error: "not a valid DXF or PDF — export as ASCII/Binary DXF (.dxf) or upload a plan PDF",
      });
    }

    const fileHash = createHash("sha256").update(fileBuf).digest("hex");
    const storageKey = isPdf ? `pdf/${fileHash}.pdf` : `dxf/${fileHash}.dxf`;
    const contentType = isPdf ? "application/pdf" : "application/dxf";
    await putObject(storageKey, fileBuf, contentType);

    // Revision chaining: if rootId is given, supersede the current revision of
    // that drawing chain and bump the revision number.
    let revNo = 1;
    let rootId: string | null = null;
    if (parsed.data.rootId) {
      const [seed] = await db.select().from(drawings).where(eq(drawings.id, parsed.data.rootId));
      if (!seed) return reply.code(404).send({ error: "revision root not found" });
      if (seed.projectId !== parsed.data.projectId)
        return reply.code(400).send({ error: "revision root belongs to another project" });
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
        status: isPdf ? "READY" : "PENDING",
        revNo,
        rootId,
        revisionNote: parsed.data.revisionNote ?? null,
        isCurrent: true,
      })
      .returning();

    if (!isPdf) {
      await enqueueJob("dxf_to_svg", {
        drawingId: row!.id,
        bucket: BUCKET,
        storageKey,
        fileHash,
      }, String(req.id));
    }

    await writeAudit(db, {
      entity: "drawing",
      entityId: row!.id,
      action: rootId ? "UPLOAD_REVISION" : "UPLOAD",
      actorId: user!.id,
      after: {
        projectId: parsed.data.projectId,
        ref,
        fileHash,
        revNo,
        rootId,
        sourceKind: isPdf ? "PDF" : "DXF",
      },
    });

    await writeActivity(db, {
      projectId: parsed.data.projectId,
      objectType: "drawing",
      objectId: row!.id,
      eventType: rootId ? "drawing.revision_uploaded" : "drawing.uploaded",
      actorId: user!.id,
      actorName: user!.fullName,
      summary: rootId
        ? `Drawing revision ${ref} (rev ${revNo}) uploaded`
        : `Drawing ${ref} uploaded`,
      metadata: {
        ref,
        revNo,
        fileName,
        title: parsed.data.title,
        sourceKind: isPdf ? "PDF" : "DXF",
      },
    });

    return reply.code(201).send(row);
  });
}
