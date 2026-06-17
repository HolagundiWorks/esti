import { InspectionActionCreate, InspectionCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { inspectionActions, inspectionPhotos, inspections, tasks } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { recordDocumentIssue } from "../../lib/documentIssue.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireUnissuedDocument } from "../../lib/retention.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const inspectionRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(inspections)
        .where(eq(inspections.projectId, input.projectId))
        .orderBy(desc(inspections.createdAt)),
    ),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.id));
    if (!row) return null;
    const [photos, actions] = await Promise.all([
      ctx.db
        .select()
        .from(inspectionPhotos)
        .where(eq(inspectionPhotos.inspectionId, input.id))
        .orderBy(asc(inspectionPhotos.sortOrder)),
      ctx.db
        .select()
        .from(inspectionActions)
        .where(eq(inspectionActions.inspectionId, input.id))
        .orderBy(asc(inspectionActions.sortOrder), asc(inspectionActions.createdAt)),
    ]);
    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({ ...p, url: await presignedGet(p.storageKey).catch(() => null) })),
    );
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, photos: photosWithUrls, actions, pdfUrl };
  }),

  create: protectedProcedure.input(InspectionCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "inspection", "SIR");
    const [row] = await ctx.db
      .insert(inspections)
      .values({
        ref,
        projectId: input.projectId,
        dateVisit: input.dateVisit ?? null,
        weather: input.weather ?? null,
        attendees: input.attendees ?? null,
        progress: input.progress ?? null,
        observations: input.observations ?? null,
        instructions: input.instructions ?? null,
        nextVisit: input.nextVisit ?? null,
        inspectorName: input.inspectorName ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "inspection", entityId: row!.id, action: "CREATE", actorId: ctx.user.id });
    return row!;
  }),

  addAction: protectedProcedure.input(InspectionActionCreate).mutation(async ({ ctx, input }) => {
    const [insp] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.inspectionId));
    if (!insp) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .insert(inspectionActions)
      .values({
        inspectionId: input.inspectionId,
        description: input.description,
        assigneeName: input.assigneeName ?? null,
        dueDate: input.dueDate ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "inspection_action",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  setActionStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(["OPEN", "DONE"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(inspectionActions).set({ status: input.status }).where(eq(inspectionActions.id, input.id));
      return { ok: true };
    }),

  convertActionToTask: protectedProcedure
    .input(z.object({ actionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [action] = await ctx.db.select().from(inspectionActions).where(eq(inspectionActions.id, input.actionId));
      if (!action) throw new TRPCError({ code: "NOT_FOUND" });
      if (action.taskId) throw new TRPCError({ code: "BAD_REQUEST", message: "Already linked to a task" });
      const [insp] = await ctx.db.select().from(inspections).where(eq(inspections.id, action.inspectionId));
      if (!insp) throw new TRPCError({ code: "NOT_FOUND" });

      const [task] = await ctx.db
        .insert(tasks)
        .values({
          title: action.description.slice(0, 200),
          description: `From site report ${insp.ref}`,
          projectId: insp.projectId,
          assignee: action.assigneeName ?? null,
          status: "TODO",
          priority: "MEDIUM",
          dueDate: action.dueDate ?? null,
        })
        .returning();

      await ctx.db
        .update(inspectionActions)
        .set({ taskId: task!.id })
        .where(eq(inspectionActions.id, input.actionId));

      await writeActivity(ctx.db, {
        projectId: insp.projectId,
        objectType: "TASK",
        objectId: task!.id,
        eventType: "task.created_from_inspection",
        actorId: ctx.user.id,
        summary: `Task from site report: ${action.description.slice(0, 80)}`,
        visibility: "STAFF",
      });

      await writeAudit(ctx.db, {
        entity: "inspection_action",
        entityId: input.actionId,
        action: "CONVERT_TASK",
        actorId: ctx.user.id,
        after: { taskId: task!.id },
      });
      return task!;
    }),

  generatePdf: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db
      .update(inspections)
      .set({ pdfStatus: "PENDING", status: "ISSUED" })
      .where(eq(inspections.id, input.id));
    await enqueueJob("render_pdf", { target: "inspection", id: row.id, firm: await firmPayload(ctx.db) }, ctx.requestId);
    await recordDocumentIssue(ctx.db, {
      entityType: "INSPECTION",
      entityId: row.id,
      projectId: row.projectId,
      ref: row.ref,
      versionNo: row.versionNo ?? 1,
      issuedById: ctx.user.id,
    });
    await writeAudit(ctx.db, {
      entity: "inspection",
      entityId: input.id,
      action: "PDF_REQUEST",
      actorId: ctx.user.id,
      before: { pdfStatus: row.pdfStatus },
      after: { pdfStatus: "PENDING", status: "ISSUED" },
    });
    return { ok: true };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    requireUnissuedDocument(row, "Inspection report");
    if (row?.pdfKey) await removeObject(row.pdfKey);
    const photos = await ctx.db.select().from(inspectionPhotos).where(eq(inspectionPhotos.inspectionId, input.id));
    for (const p of photos) if (p.storageKey) await removeObject(p.storageKey);
    await ctx.db.delete(inspectionActions).where(eq(inspectionActions.inspectionId, input.id));
    await ctx.db.delete(inspectionPhotos).where(eq(inspectionPhotos.inspectionId, input.id));
    await ctx.db.delete(inspections).where(eq(inspections.id, input.id));
    await writeAudit(ctx.db, {
      entity: "inspection",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),
});
