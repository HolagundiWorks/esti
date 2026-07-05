import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import {
  getObjectBuffer,
  objectBytes,
  putObject,
  recomputeStorageUsage,
  removeObject,
} from "../../lib/storage.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";
import { collectProjectFiles } from "./fileSources.js";

/** Refuse to base64 a bundle larger than this over tRPC — use an ops export instead. */
const MAX_BUNDLE_BYTES = 250 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  svg: "image/svg+xml",
  dxf: "application/dxf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function mimeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/** A downloadable project-file package (files as base64) — the archive/restore unit. */
export const ProjectFileBundle = z.object({
  bundleVersion: z.literal(1),
  projectId: z.string().uuid(),
  projectRef: z.string(),
  files: z.array(
    z.object({ key: z.string(), contentType: z.string(), base64: z.string() }),
  ),
});
export type ProjectFileBundle = z.infer<typeof ProjectFileBundle>;

async function getProject(db: Parameters<typeof collectProjectFiles>[0], id: string) {
  const [p] = await db.select().from(projectOffices).where(eq(projectOffices.id, id)).limit(1);
  if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return p;
}

export const projectArchiveRouter = router({
  /** Dry run: what a project holds and how much archiving its files would reclaim. */
  preview: ownerProcedure.input(z.object({ projectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const project = await getProject(ctx.db, input.projectId);
    const { keys, removableKeys } = await collectProjectFiles(ctx.db, input.projectId);
    let reclaimableBytes = 0;
    for (const k of removableKeys) reclaimableBytes += await objectBytes(k);
    return {
      projectRef: project.ref,
      projectTitle: project.title,
      fileCount: keys.length,
      removableCount: removableKeys.length,
      sharedCount: keys.length - removableKeys.length,
      reclaimableBytes,
      filesArchivedAt: project.filesArchivedAt,
      filesArchivedBytes: project.filesArchivedBytes ?? 0,
    };
  }),

  /** Package the project's files into a downloadable bundle (base64). Non-destructive. */
  export: ownerProcedure.input(z.object({ projectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const project = await getProject(ctx.db, input.projectId);
    const { keys } = await collectProjectFiles(ctx.db, input.projectId);
    let total = 0;
    for (const k of keys) total += await objectBytes(k);
    if (total > MAX_BUNDLE_BYTES) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: `Project files (${Math.round(total / 1024 / 1024)} MB) exceed the ${Math.round(
          MAX_BUNDLE_BYTES / 1024 / 1024,
        )} MB in-app package limit. Use the ops export runbook for very large projects.`,
      });
    }
    const files: ProjectFileBundle["files"] = [];
    for (const key of keys) {
      const buf = await getObjectBuffer(key).catch(() => null);
      if (!buf) continue; // already gone — skip, don't fail the whole package
      files.push({ key, contentType: mimeForKey(key), base64: buf.toString("base64") });
    }
    return { bundleVersion: 1 as const, projectId: project.id, projectRef: project.ref, files };
  }),

  /**
   * Destructive: remove the project's exclusively-owned files from the object
   * store and record the reclaim. Files shared (content-addressed) with other
   * projects are left in place. The DB records stay — so invoices/receivables
   * remain queryable. The caller must export first (keep the bundle to restore).
   */
  archive: ownerProcedure.input(z.object({ projectId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const project = await getProject(ctx.db, input.projectId);
    if (project.filesArchivedAt) {
      throw new TRPCError({ code: "CONFLICT", message: "This project's files are already archived." });
    }
    const { removableKeys } = await collectProjectFiles(ctx.db, input.projectId);
    let reclaimed = 0;
    for (const key of removableKeys) {
      reclaimed += await objectBytes(key);
      await removeObject(key);
    }
    await recomputeStorageUsage();
    const filesArchivedAt = new Date();
    await ctx.db
      .update(projectOffices)
      .set({
        filesArchivedAt,
        filesArchivedById: ctx.user.id,
        filesArchivedBytes: reclaimed,
        updatedAt: new Date(),
      })
      .where(eq(projectOffices.id, input.projectId));
    await writeAudit(ctx.db, {
      actorId: ctx.user.id,
      action: "project.files_archived",
      entity: "projectoffice",
      entityId: input.projectId,
      after: { filesArchivedAt, reclaimedBytes: reclaimed, removedKeys: removableKeys.length },
    });
    return { removedCount: removableKeys.length, reclaimedBytes: reclaimed };
  }),

  /** Restore an archived project's files from a bundle and clear the archive marker. */
  restore: ownerProcedure.input(ProjectFileBundle).mutation(async ({ ctx, input }) => {
    const project = await getProject(ctx.db, input.projectId);
    let restored = 0;
    for (const f of input.files) {
      await putObject(f.key, Buffer.from(f.base64, "base64"), f.contentType);
      restored++;
    }
    await recomputeStorageUsage();
    await ctx.db
      .update(projectOffices)
      .set({ filesArchivedAt: null, filesArchivedById: null, filesArchivedBytes: 0, updatedAt: new Date() })
      .where(eq(projectOffices.id, input.projectId));
    await writeAudit(ctx.db, {
      actorId: ctx.user.id,
      action: "project.files_restored",
      entity: "projectoffice",
      entityId: input.projectId,
      after: { restoredFiles: restored, projectRef: project.ref },
    });
    return { restoredCount: restored };
  }),
});
