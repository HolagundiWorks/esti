import { createHash } from "node:crypto";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { can } from "@esti/contracts";
import { SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { db } from "../../db/index.js";
import { clientOnboardings } from "../../db/schema.js";
import { putObject } from "../../lib/storage.js";

const DOC_MAX = 10 * 1024 * 1024; // 10 MB
const DOC_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Upload an onboarding document (signed agreement or identity proof) and attach
 * its storage key to the project's onboarding record. Slot is "agreement" or
 * "id". Upserts the onboarding row if it does not exist yet.
 */
export function registerOnboardingDocUpload(app: FastifyInstance): void {
  app.post(
    "/upload/onboarding-document",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const user = await userFromToken(req.cookies[SESSION_COOKIE]);
      if (!user) return reply.code(401).send({ error: "Not authenticated" });
      if (!can(user.role, "write"))
        return reply.code(403).send({ error: "Requires write access" });

      let filePart: MultipartFile | null = null;
      let projectId = "";
      let slot = "";

      for await (const part of req.parts()) {
        if (part.type === "file") {
          filePart = part as unknown as MultipartFile;
        } else if (part.type === "field") {
          const val = String(part.value ?? "");
          if (part.fieldname === "projectId") projectId = val;
          else if (part.fieldname === "slot") slot = val;
        }
      }

      if (!projectId) return reply.code(400).send({ error: "projectId required" });
      if (slot !== "agreement" && slot !== "id")
        return reply.code(400).send({ error: "slot must be 'agreement' or 'id'" });
      if (!filePart) return reply.code(400).send({ error: "no file" });

      const buf = await (filePart as unknown as { toBuffer: () => Promise<Buffer> }).toBuffer();
      if (buf.length === 0) return reply.code(400).send({ error: "empty file" });
      if (buf.length > DOC_MAX) return reply.code(413).send({ error: "file too large (max 10 MB)" });

      const fileName = (filePart as unknown as { filename: string }).filename || "document";
      const ext = extname(fileName).toLowerCase();
      const mime = DOC_MIME[ext];
      if (!mime) return reply.code(415).send({ error: `unsupported type ${ext}` });

      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 20);
      const key = `onboarding/${projectId}/${slot}-${hash}${ext}`;
      await putObject(key, buf, mime);

      const patch =
        slot === "agreement" ? { agreementDocKey: key } : { idDocKey: key };
      const [row] = await db
        .insert(clientOnboardings)
        .values({ projectId, ...patch })
        .onConflictDoUpdate({
          target: clientOnboardings.projectId,
          set: { ...patch, updatedAt: new Date() },
        })
        .returning({ id: clientOnboardings.id });
      void row;

      return reply.code(201).send({ ok: true, s3Key: key });
    },
  );
}
