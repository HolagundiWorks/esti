import {
  computeLineAmount,
  EstimateByProjectInput,
  EstimateCreate,
  EstimateIdInput,
  EstimateLineAdd,
  EstimateLineUpdate,
  EstimateRename,
  EstimateSetStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import {
  estEstimates,
  estLines,
  kbItems,
  kbSpecifications,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export const estimationRouter = router({
  // ── Estimates ─────────────────────────────────────────────────────────────
  listByProject: protectedProcedure
    .input(EstimateByProjectInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(estEstimates)
        .where(eq(estEstimates.projectId, input.projectId))
        .orderBy(desc(estEstimates.createdAt)),
    ),

  byId: protectedProcedure
    .input(EstimateIdInput)
    .query(async ({ ctx, input }) => {
      const [estimate] = await ctx.db
        .select()
        .from(estEstimates)
        .where(eq(estEstimates.id, input.id));
      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
      const lines = await ctx.db
        .select()
        .from(estLines)
        .where(eq(estLines.estimateId, input.id))
        .orderBy(asc(estLines.sortOrder), asc(estLines.createdAt));
      const totalPaise = lines.reduce((s, l) => s + l.amountPaise, 0);
      return { estimate, lines, totalPaise };
    }),

  create: protectedProcedure
    .input(EstimateCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(estEstimates)
        .values({ projectId: input.projectId, title: input.title })
        .returning();
      await writeAudit(ctx.db, {
        entity: "est_estimate",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  rename: protectedProcedure
    .input(EstimateRename)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(estEstimates)
        .set({ title: input.title })
        .where(eq(estEstimates.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  setStatus: protectedProcedure
    .input(EstimateSetStatus)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(estEstimates)
        .set({ status: input.status })
        .where(eq(estEstimates.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "est_estimate",
        entityId: input.id,
        action: input.status === "FINALIZED" ? "FINALIZE" : "REOPEN",
        actorId: ctx.user.id,
      });
      return row;
    }),

  remove: protectedProcedure
    .input(EstimateIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(estEstimates).where(eq(estEstimates.id, input.id));
      await writeAudit(ctx.db, {
        entity: "est_estimate",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  // ── Lines ─────────────────────────────────────────────────────────────────
  addLine: protectedProcedure
    .input(EstimateLineAdd)
    .mutation(async ({ ctx, input }) => {
      const [estimate] = await ctx.db
        .select()
        .from(estEstimates)
        .where(eq(estEstimates.id, input.estimateId));
      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
      if (estimate.status === "FINALIZED")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Estimate is finalized" });

      // Snapshot description / unit / rate from the chosen specification + item.
      let description = input.description ?? "";
      let unit = input.unit ?? null;
      let ratePaise = input.ratePaise ?? 0;
      if (input.specificationId) {
        const [spec] = await ctx.db
          .select()
          .from(kbSpecifications)
          .where(eq(kbSpecifications.id, input.specificationId));
        if (spec) {
          if (input.ratePaise === undefined) ratePaise = spec.ratePaise;
          if (!unit) unit = spec.unit;
          if (!description) {
            const lookupItemId = input.itemId ?? spec.itemId;
            const [item] = await ctx.db
              .select({ name: kbItems.name })
              .from(kbItems)
              .where(eq(kbItems.id, lookupItemId));
            description = item?.name ? `${item.name} — ${spec.name}` : spec.name;
          }
        }
      }
      if (!description) description = "Line item";

      const existing = await ctx.db
        .select({ sortOrder: estLines.sortOrder })
        .from(estLines)
        .where(eq(estLines.estimateId, input.estimateId))
        .orderBy(desc(estLines.sortOrder))
        .limit(1);
      const sortOrder = (existing[0]?.sortOrder ?? 0) + 10;

      const [row] = await ctx.db
        .insert(estLines)
        .values({
          estimateId: input.estimateId,
          itemId: input.itemId ?? null,
          specificationId: input.specificationId ?? null,
          description,
          unit,
          quantity: input.quantity,
          ratePaise,
          amountPaise: computeLineAmount(input.quantity, ratePaise),
          sortOrder,
        })
        .returning();
      return row!;
    }),

  updateLine: protectedProcedure
    .input(EstimateLineUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [existing] = await ctx.db
        .select()
        .from(estLines)
        .where(eq(estLines.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const quantity = rest.quantity ?? existing.quantity;
      const ratePaise = rest.ratePaise ?? existing.ratePaise;
      const [row] = await ctx.db
        .update(estLines)
        .set({
          ...definedOnly(rest),
          amountPaise: computeLineAmount(quantity, ratePaise),
        })
        .where(eq(estLines.id, id))
        .returning();
      return row!;
    }),

  removeLine: protectedProcedure
    .input(EstimateIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(estLines).where(eq(estLines.id, input.id));
      return { ok: true };
    }),
});
