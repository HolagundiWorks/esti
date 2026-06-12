import {
  SfElementCreate,
  SfElementUpdate,
  SfRebarCreate,
  SfRebarUpdate,
  SfSessionCreate,
  SfStirrupCreate,
  SfStirrupUpdate,
  sfDevelopmentLength,
  sfSteelWeight,
  sfStirrupCount,
  sfStirrupLength,
  sfUnitWeight,
  type SfAiReview,
  type SfBbsRow,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  sfElements,
  sfRebars,
  sfSessions,
  sfStirrups,
} from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const IdInput = z.object({ id: z.string().uuid() });

// ─── AI review rule engine ─────────────────────────────────────────────────────

function runAiReview(
  element: typeof sfElements.$inferSelect,
  rebars: (typeof sfRebars.$inferSelect)[],
  stirrups: (typeof sfStirrups.$inferSelect)[],
): SfAiReview {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Compute concrete volume (m³) and steel weight (kg)
  const concreteM3 =
    (element.widthMm / 1000) *
    (element.depthMm / 1000) *
    (element.lengthMm / 1000);

  let totalSteelKg = 0;
  for (const r of rebars) {
    const len = r.cuttingLengthMm ?? element.lengthMm;
    totalSteelKg += sfSteelWeight(r.diaMm, len, r.quantity);
  }
  for (const s of stirrups) {
    const cl = sfStirrupLength(
      element.widthMm,
      element.depthMm,
      element.coverMm,
      s.diaMm,
      s.hookAngle,
    );
    const count = sfStirrupCount(element.lengthMm, s.spacingMm);
    totalSteelKg += sfSteelWeight(s.diaMm, cl, count);
  }

  const steelPct = concreteM3 > 0 ? (totalSteelKg / (concreteM3 * 7850)) * 100 : 0;

  // IS:456 steel ratio checks for beams
  if (element.elementType === "BEAM") {
    if (steelPct < 0.3)
      warnings.push(
        `Steel ratio ${steelPct.toFixed(2)}% is below IS:456 minimum of 0.3% for beams (cl.26.5.1).`,
      );
    if (steelPct > 4.0)
      warnings.push(
        `Steel ratio ${steelPct.toFixed(2)}% exceeds IS:456 maximum of 4.0% for beams (cl.26.5.1).`,
      );

    const mainBars = rebars.filter(
      (r) => r.barType === "BOTTOM_MAIN" || r.barType === "TOP_MAIN",
    );
    if (mainBars.length === 0)
      warnings.push("No main reinforcement bars defined. Add bottom / top main bars.");

    // Check clear cover
    if (element.coverMm < 25)
      warnings.push(`Nominal cover ${element.coverMm} mm is less than IS:456 minimum 25 mm for beams.`);
  }

  if (element.elementType === "COLUMN") {
    if (steelPct < 0.8)
      warnings.push(
        `Steel ratio ${steelPct.toFixed(2)}% is below IS:456 minimum of 0.8% for columns (cl.26.5.3).`,
      );
    if (steelPct > 6.0)
      warnings.push(
        `Steel ratio ${steelPct.toFixed(2)}% exceeds IS:456 maximum of 6.0% for columns (cl.26.5.3).`,
      );
    if (element.coverMm < 40)
      warnings.push(`Nominal cover ${element.coverMm} mm is less than IS:456 minimum 40 mm for columns.`);
  }

  // Stirrup spacing checks
  for (const s of stirrups) {
    const maxSpacing = Math.min(
      element.elementType === "COLUMN" ? 300 : Math.min(0.75 * element.depthMm, 300),
      element.depthMm,
    );
    if (s.spacingMm > maxSpacing)
      warnings.push(
        `Stirrup spacing ${s.spacingMm} mm exceeds IS:456 limit of ${maxSpacing.toFixed(0)} mm.`,
      );
  }

  // AI suggestions
  if (stirrups.length === 0)
    suggestions.push("Consider adding closed stirrups (2-legged or 4-legged) for shear and confinement.");

  const mainRebarDias = rebars.map((r) => r.diaMm);
  const uniqueDias = [...new Set(mainRebarDias)];
  if (uniqueDias.length > 3)
    suggestions.push(
      `Using ${uniqueDias.length} different bar diameters. Standardise to ≤ 3 sizes for easier procurement.`,
    );

  // Development length hint
  const maxDia = rebars.length > 0 ? Math.max(...mainRebarDias) : 0;
  if (maxDia > 0) {
    const ld = sfDevelopmentLength(maxDia, element.fy, element.fck);
    suggestions.push(
      `Development length for T${maxDia} is ${ld} mm (IS:456 cl.26.2). Ensure adequate anchorage at supports.`,
    );
  }

  return {
    warnings,
    suggestions,
    summary: { totalSteelKg: Math.round(totalSteelKg * 10) / 10, steelPercentage: Math.round(steelPct * 100) / 100 },
  };
}

// ─── BBS generation ────────────────────────────────────────────────────────────

function generateBbs(
  elements: (typeof sfElements.$inferSelect)[],
  rebarsMap: Map<string, (typeof sfRebars.$inferSelect)[]>,
  stirrupsMap: Map<string, (typeof sfStirrups.$inferSelect)[]>,
): SfBbsRow[] {
  const rows: SfBbsRow[] = [];

  for (const el of elements) {
    const rebars = rebarsMap.get(el.id) ?? [];
    const stirrups = stirrupsMap.get(el.id) ?? [];

    for (const r of rebars) {
      const cl = r.cuttingLengthMm ?? el.lengthMm;
      const uw = sfUnitWeight(r.diaMm);
      const totalLen = cl * r.quantity;
      const totalWt = sfSteelWeight(r.diaMm, cl, r.quantity);
      rows.push({
        elementCode: el.elementCode,
        barMark: r.barMark,
        diaMm: r.diaMm,
        shapeCode: r.shapeCode,
        quantity: r.quantity,
        cuttingLengthMm: cl,
        totalLengthMm: totalLen,
        unitWeightKgPerM: Math.round(uw * 1000) / 1000,
        totalWeightKg: Math.round(totalWt * 100) / 100,
      });
    }

    let stirrupMark = 1;
    for (const s of stirrups) {
      const cl = Math.round(
        sfStirrupLength(el.widthMm, el.depthMm, el.coverMm, s.diaMm, s.hookAngle),
      );
      const qty = sfStirrupCount(el.lengthMm, s.spacingMm);
      const uw = sfUnitWeight(s.diaMm);
      const totalLen = cl * qty;
      const totalWt = sfSteelWeight(s.diaMm, cl, qty);
      rows.push({
        elementCode: el.elementCode,
        barMark: `S${stirrupMark++}`,
        diaMm: s.diaMm,
        shapeCode: "F",
        quantity: qty,
        cuttingLengthMm: cl,
        totalLengthMm: totalLen,
        unitWeightKgPerM: Math.round(uw * 1000) / 1000,
        totalWeightKg: Math.round(totalWt * 100) / 100,
      });
    }
  }

  return rows;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const steelflowRouter = router({
  // Sessions
  listSessions: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(sfSessions)
      .where(eq(sfSessions.createdById, ctx.user.id))
      .orderBy(desc(sfSessions.updatedAt)),
  ),

  createSession: protectedProcedure
    .input(SfSessionCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(sfSessions)
        .values({ ...input, projectId: input.projectId ?? null, createdById: ctx.user.id })
        .returning();
      return row!;
    }),

  deleteSession: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(sfSessions)
        .where(eq(sfSessions.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.createdById !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await ctx.db.delete(sfSessions).where(eq(sfSessions.id, input.id));
    }),

  // Elements
  listElements: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(sfElements)
        .where(eq(sfElements.sessionId, input.sessionId))
        .orderBy(sfElements.createdAt),
    ),

  createElement: protectedProcedure
    .input(SfElementCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(sfElements).values(input).returning();
      return row!;
    }),

  updateElement: protectedProcedure
    .input(SfElementUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(sfElements)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(sfElements.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  deleteElement: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sfElements).where(eq(sfElements.id, input.id));
    }),

  // Rebars
  listRebars: protectedProcedure
    .input(z.object({ elementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(sfRebars)
        .where(eq(sfRebars.elementId, input.elementId))
        .orderBy(sfRebars.createdAt),
    ),

  createRebar: protectedProcedure
    .input(SfRebarCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(sfRebars)
        .values({ ...input, cuttingLengthMm: input.cuttingLengthMm ?? null, posX: input.posX ?? null, posY: input.posY ?? null })
        .returning();
      return row!;
    }),

  updateRebar: protectedProcedure
    .input(SfRebarUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(sfRebars)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(sfRebars.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  deleteRebar: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sfRebars).where(eq(sfRebars.id, input.id));
    }),

  // Stirrups
  listStirrups: protectedProcedure
    .input(z.object({ elementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(sfStirrups)
        .where(eq(sfStirrups.elementId, input.elementId))
        .orderBy(sfStirrups.createdAt),
    ),

  createStirrup: protectedProcedure
    .input(SfStirrupCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(sfStirrups)
        .values({ ...input, hookLengthMm: input.hookLengthMm ?? null })
        .returning();
      return row!;
    }),

  updateStirrup: protectedProcedure
    .input(SfStirrupUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(sfStirrups)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(sfStirrups.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  deleteStirrup: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sfStirrups).where(eq(sfStirrups.id, input.id));
    }),

  // BBS generation (server-side computation returns rows for download / preview)
  generateBbs: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const elements = await ctx.db
        .select()
        .from(sfElements)
        .where(eq(sfElements.sessionId, input.sessionId))
        .orderBy(sfElements.createdAt);

      const elementIds = elements.map((e) => e.id);
      if (elementIds.length === 0) return [];

      const allRebars = await ctx.db
        .select()
        .from(sfRebars)
        .where(inArray(sfRebars.elementId, elementIds));
      const allStirrups = await ctx.db
        .select()
        .from(sfStirrups)
        .where(inArray(sfStirrups.elementId, elementIds));

      const rebarsMap = new Map<string, typeof allRebars>();
      const stirrupsMap = new Map<string, typeof allStirrups>();
      for (const r of allRebars) {
        const arr = rebarsMap.get(r.elementId) ?? [];
        arr.push(r);
        rebarsMap.set(r.elementId, arr);
      }
      for (const s of allStirrups) {
        const arr = stirrupsMap.get(s.elementId) ?? [];
        arr.push(s);
        stirrupsMap.set(s.elementId, arr);
      }

      return generateBbs(elements, rebarsMap, stirrupsMap);
    }),

  // AI review
  aiReview: protectedProcedure
    .input(z.object({ elementId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [el] = await ctx.db
        .select()
        .from(sfElements)
        .where(eq(sfElements.id, input.elementId));
      if (!el) throw new TRPCError({ code: "NOT_FOUND" });

      const rebars = await ctx.db
        .select()
        .from(sfRebars)
        .where(eq(sfRebars.elementId, input.elementId));
      const stirrups = await ctx.db
        .select()
        .from(sfStirrups)
        .where(eq(sfStirrups.elementId, input.elementId));

      return runAiReview(el, rebars, stirrups);
    }),
});
