import {
  ClientOnboardingComplete,
  ClientOnboardingUpsert,
} from "@esti/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { clientOnboardings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const writer = capabilityProcedure("write");

export const onboardingRouter = router({
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(clientOnboardings)
        .where(eq(clientOnboardings.projectId, input.projectId));
      return row ?? null;
    }),

  upsert: writer.input(ClientOnboardingUpsert).mutation(async ({ ctx, input }) => {
    const values = {
      billingAddress: input.billingAddress ?? null,
      gstin: input.gstin ?? null,
      pan: input.pan ?? null,
      authorizedReps: input.authorizedReps ?? [],
      communicationPreference: input.communicationPreference ?? null,
    };
    const [row] = await ctx.db
      .insert(clientOnboardings)
      .values({ projectId: input.projectId, ...values })
      .onConflictDoUpdate({
        target: clientOnboardings.projectId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    await writeAudit(ctx.db, { entity: "client_onboarding", entityId: row!.id, action: "UPSERT", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /** Mark onboarding complete — a gate for project activation (Slice K). */
  complete: writer.input(ClientOnboardingComplete).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(clientOnboardings)
      .set({ status: "COMPLETE", completedAt: new Date(), completedById: ctx.user.id, updatedAt: new Date() })
      .where(eq(clientOnboardings.projectId, input.projectId))
      .returning();
    if (!row) {
      // No row yet — create a completed one so the gate can pass.
      const [created] = await ctx.db
        .insert(clientOnboardings)
        .values({ projectId: input.projectId, status: "COMPLETE", completedAt: new Date(), completedById: ctx.user.id })
        .returning();
      await writeAudit(ctx.db, { entity: "client_onboarding", entityId: created!.id, action: "COMPLETE", actorId: ctx.user.id });
      return created!;
    }
    await writeAudit(ctx.db, { entity: "client_onboarding", entityId: row.id, action: "COMPLETE", actorId: ctx.user.id });
    return row;
  }),

  /** Reopen a completed onboarding (e.g. to attach corrected documents). */
  reopen: writer.input(ClientOnboardingComplete).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(clientOnboardings)
      .set({ status: "PENDING", completedAt: null, completedById: null, updatedAt: new Date() })
      .where(eq(clientOnboardings.projectId, input.projectId))
      .returning();
    return row ?? null;
  }),
});
