import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { registerImageUploadRoute } from "../../lib/imageUploadRoute.js";
import { db } from "../../db/index.js";
import { moodBoards, moodImages } from "../../db/schema.js";

/** Mood-board image upload (binary, outside tRPC). Stored content-addressed. */
export function registerMoodImageUpload(app: FastifyInstance): void {
  registerImageUploadRoute(app, {
    path: "/upload/mood-image",
    requiredField: "boardId",
    notFoundError: "board not found",
    resolveParent: async (boardId) => {
      const [board] = await db.select().from(moodBoards).where(eq(moodBoards.id, boardId));
      return board ? { id: board.id, projectId: board.projectId } : null;
    },
    storageKey: (boardId, hash, ext) => `mood/${boardId}/${hash}${ext}`,
    insertRow: async ({ parentId, storageKey, caption }) => {
      const [row] = await db
        .insert(moodImages)
        .values({ moodBoardId: parentId, storageKey, caption })
        .returning();
      return row!;
    },
    audit: ({ rowId, actor, parentId, projectId, storageKey, caption }) => ({
      entity: "moodimage",
      entityId: rowId,
      action: "UPLOAD",
      actorId: actor.id,
      after: { boardId: parentId, projectId, storageKey, caption },
    }),
  });
}
