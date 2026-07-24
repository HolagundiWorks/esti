/**
 * P7.2 — platform-admin usage report list + manual India billing marks.
 * Stripe stays out of scope; operators export CSV and stamp billed_*.
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNotNull, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { newId } from "../../lib/ids.js";
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

  /**
   * P7.3 — manual India path: suspend the org's product licence for non-payment.
   * Stripe auto-suspend stays deferred; operators bill offline then suspend here.
   * Product nodes pick this up on the next `/v1/refresh` (stamps local licence_status).
   */
  suspendForNonPayment: platformAdminProcedure
    .input(
      z.object({
        usageReportId: z.string().min(1),
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [report] = await db
        .select({
          id: schema.usageReports.id,
          orgId: schema.usageReports.orgId,
          productId: schema.usageReports.productId,
          periodStart: schema.usageReports.periodStart,
        })
        .from(schema.usageReports)
        .where(eq(schema.usageReports.id, input.usageReportId))
        .limit(1);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Usage report not found." });

      const licenses = await db
        .select({ id: schema.licenses.id, status: schema.licenses.status })
        .from(schema.licenses)
        .where(
          and(
            eq(schema.licenses.orgId, report.orgId),
            eq(schema.licenses.productId, report.productId),
            inArray(schema.licenses.status, ["ACTIVE", "TRIAL"]),
          ),
        );
      if (licenses.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No ACTIVE/TRIAL licence for this org+product to suspend.",
        });
      }

      const ids = licenses.map((l) => l.id);
      await db
        .update(schema.licenses)
        .set({ status: "SUSPENDED", updatedAt: new Date() })
        .where(inArray(schema.licenses.id, ids));

      const note =
        input.note?.trim() ||
        `Non-payment suspend (usage ${report.periodStart})`;
      for (const id of ids) {
        await db.insert(schema.licenseEvents).values({
          id: newId("evt"),
          licenseId: id,
          type: "SUSPEND",
          actor: ctx.account.email,
          meta: { reason: "non_payment", usageReportId: report.id, note },
        });
      }

      // Stamp the usage row so the billing tab shows why it was suspended.
      await db
        .update(schema.usageReports)
        .set({
          billingNote: note,
        })
        .where(eq(schema.usageReports.id, report.id));

      return { ok: true as const, suspendedLicenseIds: ids };
    }),
});
