import { HrProfileInput, JobApplicationInput } from "@esti/contracts";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { hrDocuments, hrProfiles, jobApplications, teamMembers } from "../../db/schema/hr-work.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { presignedGet } from "../../lib/storage.js";

export const hrProfileRouter = router({
  /** Get HR profile + documents for a team member. L4 (hr:manage) or own profile. */
  getProfile: protectedProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [profile] = await ctx.db
        .select()
        .from(hrProfiles)
        .where(eq(hrProfiles.memberId, input.memberId));
      const docs = await ctx.db
        .select()
        .from(hrDocuments)
        .where(eq(hrDocuments.memberId, input.memberId))
        .orderBy(desc(hrDocuments.createdAt));
      // Presign document URLs
      const docsWithUrls = await Promise.all(
        docs.map(async (d) => ({
          ...d,
          url: d.s3Key ? await presignedGet(d.s3Key).catch(() => null) : null,
        })),
      );
      return { profile: profile ?? null, documents: docsWithUrls };
    }),

  /** Create or update personal details. Requires hr:manage. */
  upsertProfile: capabilityProcedure("hr:manage")
    .input(z.object({ memberId: z.string().uuid(), data: HrProfileInput }))
    .mutation(async ({ ctx, input }) => {
      const { memberId, data } = input;
      const existing = await ctx.db
        .select({ id: hrProfiles.id })
        .from(hrProfiles)
        .where(eq(hrProfiles.memberId, memberId));
      if (existing.length > 0) {
        await ctx.db
          .update(hrProfiles)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(hrProfiles.memberId, memberId));
      } else {
        await ctx.db.insert(hrProfiles).values({ memberId, ...data });
      }
      return { ok: true };
    }),

  /** Update staffLevel and jobTitle on the team member itself. */
  updateLevel: capabilityProcedure("hr:manage")
    .input(
      z.object({
        memberId: z.string().uuid(),
        staffLevel: z.enum(["L1", "L2", "L3", "L4"]).nullable(),
        jobTitle: z.string().max(120).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(teamMembers)
        .set({ staffLevel: input.staffLevel, jobTitle: input.jobTitle ?? undefined })
        .where(eq(teamMembers.id, input.memberId));
      return { ok: true };
    }),

  /** List all documents for a member. */
  listDocuments: protectedProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const docs = await ctx.db
        .select()
        .from(hrDocuments)
        .where(eq(hrDocuments.memberId, input.memberId))
        .orderBy(desc(hrDocuments.createdAt));
      return Promise.all(
        docs.map(async (d) => ({
          ...d,
          url: d.s3Key ? await presignedGet(d.s3Key).catch(() => null) : null,
        })),
      );
    }),

  /** Delete a document (hr:manage required). */
  deleteDocument: capabilityProcedure("hr:manage")
    .input(z.object({ docId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(hrDocuments).where(eq(hrDocuments.id, input.docId));
      return { ok: true };
    }),

  /** Verify a document. */
  verifyDocument: capabilityProcedure("hr:manage")
    .input(z.object({ docId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(hrDocuments)
        .set({ verifiedBy: ctx.user.id, verifiedAt: new Date() })
        .where(eq(hrDocuments.id, input.docId));
      return { ok: true };
    }),

  /** List job applications. */
  listApplications: capabilityProcedure("hr:manage")
    .input(
      z
        .object({
          status: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(jobApplications)
        .orderBy(desc(jobApplications.appliedAt));
      if (input?.status) return rows.filter((r) => r.status === input.status);
      return rows;
    }),

  /** Create a new job application. */
  createApplication: capabilityProcedure("hr:manage")
    .input(JobApplicationInput)
    .mutation(async ({ ctx, input }) => {
      const { experienceYears, ...rest } = input;
      const [app] = await ctx.db
        .insert(jobApplications)
        .values({
          ...rest,
          handledBy: ctx.user.id,
          experienceYears: experienceYears != null ? String(experienceYears) : null,
        })
        .returning({ id: jobApplications.id });
      return app!;
    }),

  /** Move application through the pipeline. */
  updateApplicationStatus: capabilityProcedure("hr:manage")
    .input(
      z.object({
        appId: z.string().uuid(),
        status: z.string(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(jobApplications)
        .set({
          status: input.status,
          notes: input.notes ?? undefined,
          statusUpdatedAt: new Date(),
          updatedAt: new Date(),
          handledBy: ctx.user.id,
        })
        .where(eq(jobApplications.id, input.appId));
      return { ok: true };
    }),

  /** Onboard an applicant — link to (or auto-create) a team member row. */
  onboardApplication: capabilityProcedure("hr:manage")
    .input(z.object({ appId: z.string().uuid(), memberId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      let memberId = input.memberId;
      if (!memberId) {
        const [app] = await ctx.db
          .select()
          .from(jobApplications)
          .where(eq(jobApplications.id, input.appId));
        if (app) {
          const [m] = await ctx.db
            .insert(teamMembers)
            .values({
              name: app.name,
              role: (app.appliedRole as string) || "ARCHITECT",
              employmentType: "FULL_TIME",
              email: app.email,
              phone: app.phone,
              monthlySalaryPaise: 0,
              active: true,
            })
            .returning({ id: teamMembers.id });
          memberId = m?.id;
        }
      }
      await ctx.db
        .update(jobApplications)
        .set({
          memberId: memberId ?? null,
          status: "ONBOARDED",
          statusUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobApplications.id, input.appId));
      return { ok: true };
    }),
});
