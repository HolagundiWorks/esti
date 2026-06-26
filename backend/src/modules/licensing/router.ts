import { LicenseKeyStatus, LicenseSeats, Plan } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { licenses } from "../../db/schema.js";
import { env } from "../../env.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";
import { generateActivationKey } from "./service.js";

/** The licensing-authority procedures only function on the hub deployment. */
function assertHub(): void {
  if (env.ESTI_ROLE !== "hub") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The licensing authority is only available on the hub.",
    });
  }
}

/**
 * Hub-operator (vendor) licensing admin. Owner-gated *and* hub-only. The
 * customer-facing activation key is created here when a firm buys a plan; nodes
 * then activate against it via the REST `/api/license/*` endpoints.
 */
export const licensingRouter = router({
  provision: ownerProcedure
    .input(
      z.object({
        plan: Plan,
        seats: LicenseSeats.optional(),
        maxInstalls: z.number().int().positive().max(1000).default(1),
        expiresAt: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertHub();
      const [row] = await ctx.db
        .insert(licenses)
        .values({
          key: generateActivationKey(),
          plan: input.plan,
          seats: input.seats ?? {},
          maxInstalls: input.maxInstalls,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          notes: input.notes ?? null,
        })
        .returning();
      return { id: row!.id, key: row!.key, firmId: row!.firmId, plan: row!.plan };
    }),

  list: ownerProcedure.query(async ({ ctx }) => {
    assertHub();
    const rows = await ctx.db
      .select()
      .from(licenses)
      .orderBy(desc(licenses.createdAt))
      .limit(200);
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      firmId: r.firmId,
      plan: r.plan,
      status: r.status,
      maxInstalls: r.maxInstalls,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));
  }),

  setStatus: ownerProcedure
    .input(z.object({ id: z.string().uuid(), status: LicenseKeyStatus }))
    .mutation(async ({ ctx, input }) => {
      assertHub();
      await ctx.db
        .update(licenses)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(licenses.id, input.id));
      return { ok: true };
    }),
});
