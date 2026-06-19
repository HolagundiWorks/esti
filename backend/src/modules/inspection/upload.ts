import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { registerImageUploadRoute } from "../../lib/imageUploadRoute.js";
import { db } from "../../db/index.js";
import { inspectionPhotos, inspections } from "../../db/schema.js";

/** Site-report photo upload (binary, outside tRPC). */
export function registerInspectionPhotoUpload(app: FastifyInstance): void {
  registerImageUploadRoute(app, {
    path: "/upload/inspection-photo",
    requiredField: "inspectionId",
    notFoundError: "inspection not found",
    resolveParent: async (inspectionId) => {
      const [insp] = await db.select().from(inspections).where(eq(inspections.id, inspectionId));
      return insp ? { id: insp.id, projectId: insp.projectId } : null;
    },
    storageKey: (inspectionId, hash, ext) => `inspection/${inspectionId}/${hash}${ext}`,
    insertRow: async ({ parentId, storageKey, caption }) => {
      const [row] = await db
        .insert(inspectionPhotos)
        .values({ inspectionId: parentId, storageKey, caption })
        .returning();
      return row!;
    },
    audit: ({ rowId, actor, parentId, projectId, storageKey }) => ({
      entity: "inspection_photo",
      entityId: rowId,
      action: "UPLOAD",
      actorId: actor.id,
      after: { inspectionId: parentId, projectId, storageKey },
    }),
  });
}
