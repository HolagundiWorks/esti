import { createHash } from "node:crypto";
import { extname } from "node:path";
import {
  TENDER_DOC_EXTENSIONS,
  TENDER_DOC_MAX_BYTES,
  TenderDocumentKind,
} from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { tenderDocuments, tenders } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { putObject } from "../../lib/storage.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";

const UploadFields = z.object({
  tenderId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  kind: TenderDocumentKind.default("OTHER"),
  addendumNo: z.coerce.number().int().min(1).max(99).optional(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Tender package document upload (binary, outside tRPC). */
export function registerTenderDocumentUpload(app: FastifyInstance): void {
  app.post(
    "/upload/tender-document",
    { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const user = await userFromToken(req.cookies[SESSION_COOKIE]);
      const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/tender-document"]);
      if (denial) return reply.code(denial.status).send({ error: denial.error });

      const fields: Record<string, string> = {};
      let buf: Buffer | null = null;
      let fileName = "document.pdf";
      for await (const part of req.parts()) {
        if (part.type === "file") {
          fileName = part.filename || fileName;
          buf = await part.toBuffer();
        } else {
          fields[part.fieldname] = String(part.value);
        }
      }

      const passwordDenial = await verifyUploadPassword(db, fields);
      if (passwordDenial) return reply.code(passwordDenial.status).send({ error: passwordDenial.error });

      const parsed = UploadFields.safeParse(fields);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const [tender] = await db.select().from(tenders).where(eq(tenders.id, parsed.data.tenderId));
      if (!tender) return reply.code(404).send({ error: "tender not found" });
      if (!buf || buf.length === 0) return reply.code(400).send({ error: "no file" });
      if (buf.length > TENDER_DOC_MAX_BYTES) return reply.code(413).send({ error: "file too large" });

      const ext = extname(fileName).toLowerCase();
      if (!TENDER_DOC_EXTENSIONS.includes(ext as (typeof TENDER_DOC_EXTENSIONS)[number]))
        return reply.code(415).send({ error: `unsupported type ${ext}` });

      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 24);
      const key = `tender/${parsed.data.tenderId}/${hash}${ext}`;
      await putObject(key, buf, "application/octet-stream");

      const [row] = await db
        .insert(tenderDocuments)
        .values({
          tenderId: parsed.data.tenderId,
          title: parsed.data.title,
          kind: parsed.data.kind,
          fileName,
          storageKey: key,
          addendumNo: parsed.data.addendumNo ?? null,
          issuedAt: parsed.data.issuedAt ?? null,
          createdById: user!.id,
        })
        .returning();

      await writeAudit(db, {
        entity: "tender_document",
        entityId: row!.id,
        action: "UPLOAD",
        actorId: user!.id,
        after: { tenderId: parsed.data.tenderId, title: parsed.data.title, storageKey: key },
      });
      await writeActivity(db, {
        projectId: tender.projectId,
        objectType: "tender_document",
        objectId: row!.id,
        eventType: "tender.document_added",
        actorId: user!.id,
        actorName: user!.fullName,
        visibility: "STAFF",
        summary: `Tender document added: ${parsed.data.title}`,
      });

      return reply.code(201).send(row);
    },
  );
}
