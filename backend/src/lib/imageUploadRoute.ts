import { createHash } from "node:crypto";
import { extname } from "node:path";
import { MOOD_IMAGE_EXTENSIONS, MOOD_IMAGE_MAX_BYTES } from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import type { AuthUser } from "../auth/session.js";
import { SESSION_COOKIE, userFromToken } from "../auth/session.js";
import { UPLOAD_ROUTE_CAPABILITIES, uploadDenial } from "../auth/upload.js";
import { db } from "../db/index.js";
import { writeAudit } from "./audit.js";
import { imageMatchesExt } from "./filetype.js";
import { putObject } from "./storage.js";
import { verifyUploadPassword } from "./uploadSecurity.js";

type ParentLookup = { projectId?: string | null };

type ImageUploadRouteConfig = {
  path: keyof typeof UPLOAD_ROUTE_CAPABILITIES;
  requiredField: string;
  notFoundError: string;
  resolveParent: (id: string) => Promise<(ParentLookup & { id: string }) | null>;
  storageKey: (parentId: string, hash: string, ext: string) => string;
  insertRow: (input: {
    parentId: string;
    storageKey: string;
    caption: string | null;
  }) => Promise<{ id: string }>;
  audit: (input: {
    rowId: string;
    actor: AuthUser;
    parentId: string;
    projectId?: string | null;
    storageKey: string;
    caption: string | null;
  }) => Parameters<typeof writeAudit>[1];
};

function contentTypeForExt(ext: string): string {
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

export function registerImageUploadRoute(app: FastifyInstance, config: ImageUploadRouteConfig): void {
  app.post(
    config.path,
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const user = await userFromToken(req.cookies[SESSION_COOKIE]);
      const denial = uploadDenial(user, UPLOAD_ROUTE_CAPABILITIES[config.path]);
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

      const parentId = fields[config.requiredField];
      if (!parentId) return reply.code(400).send({ error: `${config.requiredField} required` });

      const passwordDenial = await verifyUploadPassword(db, fields);
      if (passwordDenial) return reply.code(passwordDenial.status).send({ error: passwordDenial.error });

      const parent = await config.resolveParent(parentId);
      if (!parent) return reply.code(404).send({ error: config.notFoundError });

      if (!buf || buf.length === 0) return reply.code(400).send({ error: "no file" });
      if (buf.length > MOOD_IMAGE_MAX_BYTES) return reply.code(413).send({ error: "file too large" });

      const ext = extname(fileName).toLowerCase();
      if (!MOOD_IMAGE_EXTENSIONS.includes(ext as (typeof MOOD_IMAGE_EXTENSIONS)[number])) {
        return reply.code(415).send({ error: `unsupported type ${ext}` });
      }
      if (!imageMatchesExt(buf, ext)) {
        return reply.code(415).send({ error: "file content does not match its type" });
      }

      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 24);
      const storageKey = config.storageKey(parent.id, hash, ext);
      await putObject(storageKey, buf, contentTypeForExt(ext));

      const caption = fields.caption ?? null;
      const row = await config.insertRow({ parentId: parent.id, storageKey, caption });
      await writeAudit(
        db,
        config.audit({
          rowId: row.id,
          actor: user!,
          parentId: parent.id,
          projectId: parent.projectId,
          storageKey,
          caption,
        }),
      );
      return reply.code(201).send(row);
    },
  );
}
