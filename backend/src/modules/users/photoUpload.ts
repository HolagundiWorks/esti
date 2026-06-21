import { createHash } from "node:crypto";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { imageMatchesExt } from "../../lib/filetype.js";
import { putObject } from "../../lib/storage.js";

const PHOTO_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const PHOTO_MAX = 2 * 1024 * 1024; // 2 MB

function contentType(ext: string): string {
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

/** Staff uploads their own profile photo. */
export function registerProfilePhotoUpload(app: FastifyInstance): void {
  app.post("/upload/profile-photo", {
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/profile-photo"]);
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    let buf: Buffer | null = null;
    let fileName = "photo.jpg";
    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileName = part.filename || fileName;
        buf = await part.toBuffer();
      }
    }

    if (!buf || buf.length === 0) return reply.code(400).send({ error: "no file" });
    if (buf.length > PHOTO_MAX) return reply.code(413).send({ error: "file too large (max 2 MB)" });
    const ext = extname(fileName).toLowerCase();
    if (!PHOTO_EXT.includes(ext)) return reply.code(415).send({ error: `unsupported type ${ext}` });
    if (!imageMatchesExt(buf, ext)) return reply.code(415).send({ error: "file content does not match its type" });

    const hash = createHash("sha256").update(buf).digest("hex").slice(0, 20);
    const key = `profile/${user!.id}/${hash}${ext}`;
    await putObject(key, buf, contentType(ext));

    const [before] = await db.select({ photoKey: users.photoKey }).from(users).where(eq(users.id, user!.id));
    await db.update(users).set({ photoKey: key }).where(eq(users.id, user!.id));
    await writeAudit(db, {
      entity: "user",
      entityId: user!.id,
      action: "PHOTO_UPLOAD",
      actorId: user!.id,
      before: { photoKey: before?.photoKey },
      after: { photoKey: key },
    });
    return reply.code(201).send({ ok: true, photoKey: key });
  });
}
