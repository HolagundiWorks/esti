import { createHash } from "node:crypto";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { complianceDocs } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";
import { putObject } from "../../lib/storage.js";

const ALLOWED_EXT = [".pdf", ".dwg", ".dxf", ".png", ".jpg"] as const;
const MAX_BYTES = 50 * 1024 * 1024;
const CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".dwg": "application/acad",
  ".dxf": "image/vnd.dxf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

const VALID_CATEGORIES = ["NBC", "FAR", "SETBACK", "FIRE", "REGULATION", "OTHER"] as const;

export function registerComplianceDocUpload(app: FastifyInstance): void {
  app.post("/upload/compliance-doc", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/compliance-doc"]);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    const fields: Record<string, string> = {};
    let fileBuf: Buffer | null = null;
    let fileName = "document";
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
    if (fileBuf.length > MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    const ext = extname(fileName).toLowerCase();
    if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
      return reply.code(415).send({ error: `unsupported type ${ext}` });
    }

    const title = (fields.title ?? "").trim() || fileName;
    const category = VALID_CATEGORIES.includes(fields.category as (typeof VALID_CATEGORIES)[number])
      ? fields.category
      : "OTHER";

    const hash = createHash("sha256").update(fileBuf).digest("hex").slice(0, 32);
    const fileKey = `compliance/${hash}${ext}`;
    await putObject(fileKey, fileBuf, CONTENT_TYPE[ext] ?? "application/octet-stream");

    const [row] = await db
      .insert(complianceDocs)
      .values({
        title,
        category: category!,
        fileKey,
        fileName,
        fileType: ext.replace(".", "").toUpperCase(),
        notes: fields.notes?.trim() || null,
        uploadedById: user!.id,
      })
      .returning();
    await writeAudit(db, {
      entity: "compliance_doc",
      entityId: row!.id,
      action: "UPLOAD",
      actorId: user!.id,
      after: { title, category, fileKey },
    });
    return reply.send({ ok: true, id: row!.id });
  });
}
