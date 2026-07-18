import { createHash } from "node:crypto";
import { extname } from "node:path";
import {
  normalizePlainToMarkdown,
  REPO_TEXTBOOK_EXTENSIONS,
  REPO_TEXTBOOK_MAX_BYTES,
} from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../../auth/upload.js";
import { db } from "../../db/index.js";
import { repoSources } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { enqueueJob } from "../../lib/redis.js";
import { BUCKET, putObject } from "../../lib/storage.js";
import { verifyUploadPassword } from "../../lib/uploadSecurity.js";

/** Attach a reference file — PDFs queue HCW Markdown Tool pipeline (worker); txt/md import as markdown. */
export function registerRepoTextbookUpload(app: FastifyInstance): void {
  app.post("/upload/repo-textbook", {
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES["/upload/repo-textbook"]);
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

    const sourceId = fields.sourceId;
    if (!sourceId) return reply.code(400).send({ error: "sourceId required" });
    const [parent] = await db.select({ id: repoSources.id }).from(repoSources).where(eq(repoSources.id, sourceId));
    if (!parent) return reply.code(404).send({ error: "source not found" });

    if (!fileBuf || fileBuf.length === 0) return reply.code(400).send({ error: "no file" });
    if (fileBuf.length > REPO_TEXTBOOK_MAX_BYTES) return reply.code(413).send({ error: "file too large" });
    const ext = extname(fileName).toLowerCase();
    if (!REPO_TEXTBOOK_EXTENSIONS.includes(ext as (typeof REPO_TEXTBOOK_EXTENSIONS)[number])) {
      return reply.code(415).send({ error: `unsupported type ${ext}` });
    }

    const hash = createHash("sha256").update(fileBuf).digest("hex").slice(0, 32);
    const fileKey = `repo-portal/${sourceId}/${hash}${ext}`;
    await putObject(fileKey, fileBuf, "application/octet-stream");

    const isPdf = ext === ".pdf";
    let markdownText: string | undefined;
    if (ext === ".md") {
      markdownText = fileBuf.toString("utf8").trim();
    } else if (ext === ".txt") {
      markdownText = normalizePlainToMarkdown(fileBuf.toString("utf8"));
    }

    const patch: Record<string, unknown> = {
      fileKey,
      fileName,
      updatedAt: new Date(),
      status: "DRAFT",
    };

    if (isPdf) {
      patch.convertStatus = "PROCESSING";
      patch.convertError = null;
      patch.markdownText = null;
    } else if (markdownText && markdownText.length >= 200) {
      patch.markdownText = markdownText;
      patch.rawText = markdownText;
      patch.convertStatus = "READY";
      patch.convertError = null;
    }

    const [row] = await db
      .update(repoSources)
      .set(patch)
      .where(eq(repoSources.id, sourceId))
      .returning();

    if (isPdf) {
      await enqueueJob("pdf_to_markdown", {
        sourceId,
        fileKey,
        bucket: BUCKET,
      });
    }

    await writeAudit(db, {
      entity: "repo_source",
      entityId: sourceId,
      action: "UPLOAD",
      actorId: user!.id,
      after: { fileKey, fileName, isPdf, textImported: !!markdownText },
    });
    return reply.send({
      ok: true,
      id: row!.id,
      textImported: !!markdownText,
      converting: isPdf,
    });
  });
}
