import { createHash } from "node:crypto";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { firm } from "../../db/schema.js";
import { getFirm } from "../../lib/firm.js";
import { writeAudit } from "../../lib/audit.js";
import { imageMatchesExt } from "../../lib/filetype.js";
import { putObject } from "../../lib/storage.js";

const LOGO_EXT = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
const LOGO_MAX = 2 * 1024 * 1024; // 2 MB

/** Owner uploads the firm logo (binary, outside tRPC). */
export function registerFirmLogoUpload(app: FastifyInstance): void {
  app.post("/upload/firm-logo", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, "firm:admin");
    if (denial) return reply.code(denial.status).send({ error: denial.error });

    let buf: Buffer | null = null;
    let fileName = "logo.png";
    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileName = part.filename || fileName;
        buf = await part.toBuffer();
      }
    }
    if (!buf || buf.length === 0) return reply.code(400).send({ error: "no file" });
    if (buf.length > LOGO_MAX) return reply.code(413).send({ error: "file too large" });
    const ext = extname(fileName).toLowerCase();
    if (!LOGO_EXT.includes(ext)) return reply.code(415).send({ error: `unsupported type ${ext}` });
    // Content sniff: magic bytes must match the claimed image type; SVGs must
    // also be free of script/event-handler XSS vectors.
    if (!imageMatchesExt(buf, ext))
      return reply.code(415).send({ error: "file content does not match its type" });

    const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const key = `logo/${hash}${ext}`;
    const ct =
      ext === ".svg" ? "image/svg+xml" : ext === ".webp" ? "image/webp" : `image/${ext.slice(1)}`;
    await putObject(key, buf, ct);

    const current = await getFirm(db);
    await db.update(firm).set({ logoKey: key }).where(eq(firm.id, current.id));
    await writeAudit(db, {
      entity: "firm",
      entityId: current.id,
      action: "LOGO_UPLOAD",
      actorId: user!.id,
      before: { logoKey: current.logoKey },
      after: { logoKey: key },
    });
    return reply.code(201).send({ ok: true, logoKey: key });
  });
}
