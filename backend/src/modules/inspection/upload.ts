import { createHash } from "node:crypto";
import { extname } from "node:path";
import { MOOD_IMAGE_EXTENSIONS, MOOD_IMAGE_MAX_BYTES } from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { inspectionPhotos, inspections } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { imageMatchesExt } from "../../lib/filetype.js";
import { putObject } from "../../lib/storage.js";

/** Site-report photo upload (binary, outside tRPC). */
export function registerInspectionPhotoUpload(app: FastifyInstance): void {
  app.post(
    "/upload/inspection-photo",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const user = await userFromToken(req.cookies[SESSION_COOKIE]);
      const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/inspection-photo"]);
      if (denial) return reply.code(denial.status).send({ error: denial.error });

      const fields: Record<string, string> = {};
      let buf: Buffer | null = null;
      let fileName = "image.png";
      for await (const part of req.parts()) {
        if (part.type === "file") {
          fileName = part.filename || fileName;
          buf = await part.toBuffer();
        } else {
          fields[part.fieldname] = String(part.value);
        }
      }
      const inspectionId = fields.inspectionId;
      if (!inspectionId) return reply.code(400).send({ error: "inspectionId required" });
      const [insp] = await db.select().from(inspections).where(eq(inspections.id, inspectionId));
      if (!insp) return reply.code(404).send({ error: "inspection not found" });
      if (!buf || buf.length === 0) return reply.code(400).send({ error: "no file" });
      if (buf.length > MOOD_IMAGE_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
      const ext = extname(fileName).toLowerCase();
      if (!MOOD_IMAGE_EXTENSIONS.includes(ext as (typeof MOOD_IMAGE_EXTENSIONS)[number]))
        return reply.code(415).send({ error: `unsupported type ${ext}` });
      if (!imageMatchesExt(buf, ext))
        return reply.code(415).send({ error: "file content does not match its type" });

      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 24);
      const key = `inspection/${inspectionId}/${hash}${ext}`;
      const ct = ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
      await putObject(key, buf, ct);
      const [row] = await db
        .insert(inspectionPhotos)
        .values({ inspectionId, storageKey: key, caption: fields.caption ?? null })
        .returning();
      await writeAudit(db, {
        entity: "inspection_photo",
        entityId: row!.id,
        action: "UPLOAD",
        actorId: user!.id,
        after: { inspectionId, projectId: insp.projectId, storageKey: key },
      });
      return reply.code(201).send(row);
    },
  );
}
