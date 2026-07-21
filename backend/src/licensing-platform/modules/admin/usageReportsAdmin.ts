/**
 * P7.2 — platform-admin usage report list + manual India billing marks.
 * Stripe stays out of scope; operators export CSV and stamp billed_*.
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import { usagePeriodStart, usageReportsToCsv } from "./usageReports.js";

export const usageReportsRouter = router({
  list: platformAdminProcedure
    .input(
      z
        .object({
          periodStart: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          billed: z.enum(["all", "billed", "unbilled"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const periodStart = input?.periodStart ?? usagePeriodStart();
      const conds: SQL[] = [eq(schema.usageReports.periodStart, periodStart)];
      if (input?.billed === "billed") conds.push(isNotNull(schema.usageReports.billedAt));
      if (input?.billed === "unbilled") conds.push(isNull(schema.usageReports.billedAt));
      return db
        .select({
          id: schema.usageReports.id,
          orgId: schema.usageReports.orgId,
          orgName: schema.organizations.name,
          productId: schema.usageReports.productId,
          productCode: schema.products.code,
          periodStart: schema.usageReports.periodStart,
          storageUsedBytes: schema.usageReports.storageUsedBytes,
          storageQuotaBytes: schema.usageReports.storageQuotaBytes,
          storagePurchasedBytes: schema.usageReports.storagePurchasedBytes,
          aiTokensThisMonth: schema.usageReports.aiTokensThisMonth,
          reportedAt: schema.usageReports.reportedAt,
          billedAt: schema.usageReports.billedAt,
          billedBy: schema.usageReports.billedBy,
          billingNote: schema.usageReports.billingNote,
        })
        .from(schema.usageReports)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.usageReports.orgId))
        .innerJoin(schema.products, eq(schema.products.id, schema.usageReports.productId))
        .where(and(...conds))
        .orderBy(desc(schema.usageReports.storageUsedBytes));
    }),

  exportCsv: platformAdminProcedure
    .input(
      z
        .object({
          periodStart: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          billed: z.enum(["all", "billed", "unbilled"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const periodStart = input?.periodStart ?? usagePeriodStart();
      const conds: SQL[] = [eq(schema.usageReports.periodStart, periodStart)];
      if (input?.billed === "billed") conds.push(isNotNull(schema.usageReports.billedAt));
      if (input?.billed === "unbilled") conds.push(isNull(schema.usageReports.billedAt));
      const rows = await db
        .select({
          periodStart: schema.usageReports.periodStart,
          orgName: schema.organizations.name,
          productCode: schema.products.code,
          storageUsedBytes: schema.usageReports.storageUsedBytes,
          storageQuotaBytes: schema.usageReports.storageQuotaBytes,
          storagePurchasedBytes: schema.usageReports.storagePurchasedBytes,
          aiTokensThisMonth: schema.usageReports.aiTokensThisMonth,
          reportedAt: schema.usageReports.reportedAt,
          billedAt: schema.usageReports.billedAt,
          billedBy: schema.usageReports.billedBy,
          billingNote: schema.usageReports.billingNote,
        })
        .from(schema.usageReports)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.usageReports.orgId))
        .innerJoin(schema.products, eq(schema.products.id, schema.usageReports.productId))
        .where(and(...conds))
        .orderBy(desc(schema.usageReports.storageUsedBytes));
      return {
        periodStart,
        filename: `aorms-usage-${periodStart}.csv`,
        csv: usageReportsToCsv(rows),
      };
    }),

  markBilled: platformAdminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        billingNote: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [row] = await db
        .update(schema.usageReports)
        .set({
          billedAt: new Date(),
          billedBy: ctx.account.email,
          billingNote: input.billingNote?.trim() || null,
        })
        .where(eq(schema.usageReports.id, input.id))
        .returning({
          id: schema.usageReports.id,
          billedAt: schema.usageReports.billedAt,
          billedBy: schema.usageReports.billedBy,
          billingNote: schema.usageReports.billingNote,
        });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Usage report not found." });
      return row;
    }),

  markUnbilled: platformAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(schema.usageReports)
        .set({ billedAt: null, billedBy: null, billingNote: null })
        .where(eq(schema.usageReports.id, input.id))
        .returning({ id: schema.usageReports.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Usage report not found." });
      return { ok: true as const };
    }),
});
