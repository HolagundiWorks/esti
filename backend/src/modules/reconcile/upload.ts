import { createHash } from "node:crypto";
import { extname } from "node:path";
import {
  RECONCILE_EXTENSIONS,
  RECONCILE_MAX_BYTES,
  ReconcileColumnMapping,
  ReconcileUploadFields,
} from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { reconciliations } from "../../db/schema.js";
import { tabularMatchesExt } from "../../lib/filetype.js";
import { writeAudit } from "../../lib/audit.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { BUCKET, putObject } from "../../lib/storage.js";

/**
 * Bank-statement upload (binary, outside tRPC). Stored content-addressed; a
 * reconcile_import job is enqueued for the Python worker (pandas).
 */
export function registerReconcileUpload(app: FastifyInstance): void {
  app.post("/upload/reconcile", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/reconcile"]);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    const fields: Record<string, string> = {};
    let fileBuf: Buffer | null = null;
    let fileName = "statement.csv";

    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileName = part.filename || fileName;
        fileBuf = await part.toBuffer();
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }

    const passwordDenial = await verifyUploadPassword(db, fields);
    if (passwordDenial) return reply.code(passwordDenial.status).send({ error: passwordDenial.error });

    const parsed = ReconcileUploadFields.safeParse(fields);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    let columnMapping: Record<string, string> | null = null;
    if (fields.columnMapping) {
      try {
        const m = ReconcileColumnMapping.parse(JSON.parse(fields.columnMapping));
        columnMapping = Object.fromEntries(
          Object.entries(m).filter(([, v]) => v) as [string, string][],
        );
      } catch {
        return reply.code(400).send({ error: "invalid columnMapping JSON" });
      }
    }
    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > RECONCILE_MAX_BYTES)
      return reply.code(413).send({ error: "file too large" });

    const ext = extname(fileName).toLowerCase();
    if (!RECONCILE_EXTENSIONS.includes(ext as (typeof RECONCILE_EXTENSIONS)[number]))
      return reply.code(415).send({ error: `unsupported type ${ext}` });
    // Content sniff: CSV must be textual; XLSX/XLS must have the right container.
    if (!tabularMatchesExt(fileBuf, ext))
      return reply.code(415).send({ error: "file content does not match its type" });

    const fileHash = createHash("sha256").update(fileBuf).digest("hex");
    const storageKey = `reconcile/${fileHash}${ext}`;
    await putObject(storageKey, fileBuf, "application/octet-stream");

    const { ref } = await nextRef(db, "reconcile", "RCN");
    const [row] = await db
      .insert(reconciliations)
      .values({
        ref,
        label: parsed.data.label,
        fileName,
        fileHash,
        storageKey,
        sizeBytes: fileBuf.length,
        status: "PENDING",
        columnMapping,
      })
      .returning();

    await enqueueJob("reconcile_import", {
      reconcileId: row!.id,
      bucket: BUCKET,
      storageKey,
      fileName,
      columnMapping,
    }, String(req.id));

    await writeAudit(db, {
      entity: "reconcile",
      entityId: row!.id,
      action: "UPLOAD",
      actorId: user!.id,
      after: { ref, label: parsed.data.label, fileName, fileHash },
    });

    return reply.code(201).send(row);
  });
}
