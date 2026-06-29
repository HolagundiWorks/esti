import { createHash } from "node:crypto";
import { extname } from "node:path";
import { MASTER_PLAN_EXTENSIONS, MASTER_PLAN_MAX_BYTES } from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { masterPlans } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";
import { putObject } from "../../lib/storage.js";

const CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".dwg": "application/acad",
  ".dxf": "image/vnd.dxf",
};

/** Master-plan file upload (binary, outside tRPC). Content-addressed; inserts a row. */
export function registerMasterPlanUpload(app: FastifyInstance): void {
  app.post("/upload/master-plan", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/master-plan"]);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    const fields: Record<string, string> = {};
    let fileBuf: Buffer | null = null;
    let fileName = "plan";
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
    if (fileBuf.length > MASTER_PLAN_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    const ext = extname(fileName).toLowerCase();
    if (!MASTER_PLAN_EXTENSIONS.includes(ext as (typeof MASTER_PLAN_EXTENSIONS)[number])) {
      return reply.code(415).send({ error: `unsupported type ${ext}` });
    }
    const name = (fields.name ?? "").trim() || fileName;
    const category = ["PDF", "DWG", "ZONING", "DEVELOPMENT"].includes(fields.category ?? "")
      ? fields.category
      : "PDF";

    const hash = createHash("sha256").update(fileBuf).digest("hex").slice(0, 32);
    const fileKey = `masterplan/${hash}${ext}`;
    await putObject(fileKey, fileBuf, CONTENT_TYPE[ext] ?? "application/octet-stream");

    const [row] = await db
      .insert(masterPlans)
      .values({
        name,
        category,
        fileKey,
        fileName,
        fileType: ext.replace(".", "").toUpperCase(),
        notes: fields.notes?.trim() || null,
        uploadedById: user!.id,
      })
      .returning();
    await writeAudit(db, { entity: "master_plan", entityId: row!.id, action: "UPLOAD", actorId: user!.id, after: { name, category, fileKey } });
    return reply.send({ ok: true, id: row!.id });
  });
}
