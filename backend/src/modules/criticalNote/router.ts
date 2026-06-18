import { ProjectCursorListParams, clampListLimit } from "@esti/contracts";
import { desc, eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { criticalNotes } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { buildCursorPage, cursorWhere } from "../../lib/cursorPage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const criticalNoteInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200),
  category: z.string().min(1).max(80),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["OPEN", "BLOCKED", "RESOLVED"]).default("OPEN"),
  visibility: z.enum(["STAFF", "ALL"]).default("STAFF"),
  owner: z.string().max(120).optional(),
  dueDate: z.string().date().nullish(),
  body: z.string().max(4000).optional(),
});

export const criticalNoteRouter = router({
  listByProject: protectedProcedure
    .input(ProjectCursorListParams)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(criticalNotes)
        .where(
          and(
            eq(criticalNotes.projectId, input.projectId),
            cursorWhere(input.cursor, criticalNotes.createdAt, criticalNotes.id),
          ),
        )
        .orderBy(desc(criticalNotes.createdAt), desc(criticalNotes.id))
        .limit(clampListLimit(input.limit) + 1);
      return buildCursorPage(rows, input.limit);
    }),

  create: protectedProcedure.input(criticalNoteInput).mutation(async ({ ctx, input }) => {
    const row = await ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(criticalNotes)
        .values({
          projectId: input.projectId,
          title: input.title,
          category: input.category,
          priority: input.priority,
          status: input.status,
          visibility: input.visibility,
          owner: input.owner ?? null,
          dueDate: input.dueDate ?? null,
          body: input.body ?? null,
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
        })
        .returning();
      await writeActivity(tx, {
        projectId: input.projectId,
        objectType: "critical_note",
        objectId: created!.id,
        eventType: "critical_note.created",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: input.visibility,
        summary: created!.title,
        metadata: created,
      });
      await writeAudit(tx, {
        entity: "critical_note",
        entityId: created!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: created,
      });
      return created!;
    });
    return row;
  }),

  update: protectedProcedure
    .input(
      criticalNoteInput.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(criticalNotes).where(eq(criticalNotes.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Critical note not found" });
    const row = await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(criticalNotes)
          .set({
            title: input.title,
            category: input.category,
            priority: input.priority,
            status: input.status,
            visibility: input.visibility,
            owner: input.owner ?? null,
            dueDate: input.dueDate ?? null,
            body: input.body ?? null,
            updatedAt: new Date(),
          })
          .where(eq(criticalNotes.id, input.id))
          .returning();
        await writeActivity(tx, {
          projectId: updated!.projectId,
          objectType: "critical_note",
          objectId: updated!.id,
          eventType: "critical_note.updated",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          visibility: input.visibility,
          summary: updated!.title,
          metadata: { before, after: updated },
        });
        await writeAudit(tx, {
          entity: "critical_note",
          entityId: input.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          before,
          after: updated,
        });
        return updated!;
      });
      return row;
    }),
});
