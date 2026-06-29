import { createHash } from "node:crypto";
import { extname } from "node:path";
import { STANDARD_FILE_EXTENSIONS, STANDARD_FILE_MAX_BYTES } from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { standardFiles, standards } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";
import { putObject } from "../../lib/storage.js";

/** Standard-file upload (binary, outside tRPC) — attaches a file to a standard. */
export function registerStandardFileUpload(app: FastifyInstance): void {
  app.post("/upload/standard-file", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/standard-file"]);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    const fields: Record<string, string> = {};
    let fileBuf: Buffer | null = null;
    let fileName = "file";
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

    const standardId = fields.standardId;
    if (!standardId) return reply.code(400).send({ error: "standardId required" });
    const [parent] = await db.select({ id: standards.id }).from(standards).where(eq(standards.id, standardId));
    if (!parent) return reply.code(404).send({ error: "standard not found" });

    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > STANDARD_FILE_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    const ext = extname(fileName).toLowerCase();
    if (!STANDARD_FILE_EXTENSIONS.includes(ext as (typeof STANDARD_FILE_EXTENSIONS)[number])) {
      return reply.code(415).send({ error: `unsupported type ${ext}` });
    }
    const kind = ["PDF", "DRAWING", "DETAIL"].includes(fields.kind ?? "") ? fields.kind : "PDF";

    const hash = createHash("sha256").update(fileBuf).digest("hex").slice(0, 32);
    const fileKey = `standards/${standardId}/${hash}${ext}`;
    await putObject(fileKey, fileBuf, "application/octet-stream");

    const [row] = await db
      .insert(standardFiles)
      .values({ standardId, kind, fileKey, fileName })
      .returning();
    await writeAudit(db, { entity: "standard_file", entityId: row!.id, action: "UPLOAD", actorId: user!.id, after: { standardId, kind, fileKey } });
    return reply.send({ ok: true, id: row!.id });
  });
}
