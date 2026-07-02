import { createHash } from "node:crypto";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { can } from "@esti/contracts";
import { db } from "../../db/index.js";
import { hrDocuments, teamMembers } from "../../db/schema/hr-work.js";
import { putObject } from "../../lib/storage.js";

const DOC_MAX = 10 * 1024 * 1024; // 10 MB
const DOC_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Upload a document file to an HR member's vault. */
export function registerHrDocUpload(app: FastifyInstance): void {
  app.post("/upload/hr-document", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const user = await userFromToken(req.cookies[SESSION_COOKIE]);
    if (!user) return reply.code(401).send({ error: "Not authenticated" });
    if (!can(user.role, "hr:manage"))
      return reply.code(403).send({ error: "Requires hr:manage capability (L4+)" });

    let filePart: MultipartFile | null = null;
    let memberId = "";
    let documentType = "OTHER";
    let documentName = "";
    let issueDate: string | undefined;
    let expiryDate: string | undefined;
    let notes: string | undefined;

    for await (const part of req.parts()) {
      if (part.type === "file") {
        filePart = part as unknown as MultipartFile;
      } else if (part.type === "field") {
        const val = String(part.value ?? "");
        if (part.fieldname === "memberId") memberId = val;
        else if (part.fieldname === "documentType") documentType = val;
        else if (part.fieldname === "documentName") documentName = val;
        else if (part.fieldname === "issueDate") issueDate = val || undefined;
        else if (part.fieldname === "expiryDate") expiryDate = val || undefined;
        else if (part.fieldname === "notes") notes = val || undefined;
      }
    }

    if (!memberId) return reply.code(400).send({ error: "memberId required" });
    if (!filePart) return reply.code(400).send({ error: "no file" });

    // Validate member exists
    const [member] = await db.select({ id: teamMembers.id, name: teamMembers.name })
      .from(teamMembers).where(eq(teamMembers.id, memberId));
    if (!member) return reply.code(404).send({ error: "Team member not found" });

    const buf = await (filePart as unknown as { toBuffer: () => Promise<Buffer> }).toBuffer();
    if (buf.length === 0) return reply.code(400).send({ error: "empty file" });
    if (buf.length > DOC_MAX) return reply.code(413).send({ error: "file too large (max 10 MB)" });

    const fileName = (filePart as unknown as { filename: string }).filename || "document";
    const ext = extname(fileName).toLowerCase();
    const mime = DOC_MIME[ext];
    if (!mime) return reply.code(415).send({ error: `unsupported type ${ext}` });

    const hash = createHash("sha256").update(buf).digest("hex").slice(0, 20);
    const key = `hr-docs/${memberId}/${hash}${ext}`;
    await putObject(key, buf, mime);

    const name = documentName || `${documentType} — ${member.name}`;
    const [doc] = await db.insert(hrDocuments).values({
      memberId,
      documentType,
      documentName: name,
      s3Key: key,
      fileName,
      fileSize: buf.length,
      mimeType: mime,
      issueDate: issueDate ?? null,
      expiryDate: expiryDate ?? null,
      notes,
    }).returning({ id: hrDocuments.id });

    return reply.code(201).send({ ok: true, docId: doc!.id, s3Key: key });
  });
}
