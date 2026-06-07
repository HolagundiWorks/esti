import { LeaveCreate, LeaveStatusUpdate, PayslipCreate, PayslipMarkPaid } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { leaves, payslips, teamMembers } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const leaveRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: leaves.id,
        name: teamMembers.name,
        type: leaves.type,
        fromDate: leaves.fromDate,
        toDate: leaves.toDate,
        days: leaves.days,
        reason: leaves.reason,
        status: leaves.status,
      })
      .from(leaves)
      .innerJoin(teamMembers, eq(teamMembers.id, leaves.teamMemberId))
      .orderBy(desc(leaves.createdAt));
  }),

  create: protectedProcedure.input(LeaveCreate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [row] = await ctx.db
      .insert(leaves)
      .values({
        teamMemberId: input.teamMemberId,
        type: input.type,
        fromDate: input.fromDate,
        toDate: input.toDate,
        days: input.days,
        reason: input.reason ?? null,
      })
      .returning();
    return row!;
  }),

  setStatus: ownerProcedure.input(LeaveStatusUpdate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(leaves)
      .set({ status: input.status })
      .where(eq(leaves.id, input.id))
      .returning();
    return row ?? null;
  }),
});

export const payrollRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: payslips.id,
        name: teamMembers.name,
        month: payslips.month,
        grossPaise: payslips.grossPaise,
        deductionsPaise: payslips.deductionsPaise,
        netPaise: payslips.netPaise,
        paid: payslips.paid,
        paidDate: payslips.paidDate,
      })
      .from(payslips)
      .innerJoin(teamMembers, eq(teamMembers.id, payslips.teamMemberId))
      .orderBy(desc(payslips.month), desc(payslips.createdAt));
  }),

  generate: ownerProcedure.input(PayslipCreate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [member] = await ctx.db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, input.teamMemberId));
    if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "team member not found" });

    const grossPaise = input.grossPaise ?? member.monthlySalaryPaise;
    const netPaise = grossPaise - input.deductionsPaise;

    // The (member, month) unique index guarantees one payslip per month.
    try {
      const [row] = await ctx.db
        .insert(payslips)
        .values({
          teamMemberId: input.teamMemberId,
          month: input.month,
          grossPaise,
          deductionsPaise: input.deductionsPaise,
          netPaise,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "payslip",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    } catch {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Payslip already exists for ${member.name} ${input.month}`,
      });
    }
  }),

  markPaid: ownerProcedure.input(PayslipMarkPaid).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(payslips)
      .set({ paid: true, paidDate: new Date().toISOString().slice(0, 10) })
      .where(eq(payslips.id, input.id))
      .returning();
    return row ?? null;
  }),
});
