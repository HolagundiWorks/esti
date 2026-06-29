import {
  DocumentRegisterFilter,
  DocumentReviseInput,
  NumberingPatterns,
  OfficeTemplateCreate,
  OfficeTemplateKind,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  documentIssues,
  inspections,
  officeTemplates,
  orgSettings,
  specSheets,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { recordDocumentIssue } from "../../lib/documentIssue.js";
import { getOrgSettings } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { listDocumentRegister, registerExportRows } from "./readModels.js";

export const documentRouter = router({
  register: protectedProcedure
    .input(DocumentRegisterFilter.optional())
    .query(async ({ ctx, input }) => listDocumentRegister(ctx.db, input ?? { limit: 200 })),

  registerExport: protectedProcedure
    .input(DocumentRegisterFilter.optional())
    .query(async ({ ctx, input }) => {
      const rows = await listDocumentRegister(ctx.db, input ?? { limit: 500 });
      return registerExportRows(rows);
    }),

  issueHistory: protectedProcedure
    .input(z.object({ entityType: z.string(), entityId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(documentIssues)
        .where(eq(documentIssues.entityId, input.entityId))
        .orderBy(desc(documentIssues.issuedAt)),
    ),

  numberingPatterns: protectedProcedure.query(async ({ ctx }) => {
    const s = await getOrgSettings(ctx.db);
    return NumberingPatterns.parse(s.numberingPatterns ?? {});
  }),

  setNumberingPatterns: ownerProcedure
    .input(NumberingPatterns)
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ numberingPatterns: input })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "NUMBERING_UPDATE",
        actorId: ctx.user.id,
        after: input,
      });
      return NumberingPatterns.parse(row!.numberingPatterns ?? {});
    }),

  listTemplates: protectedProcedure
    .input(z.object({ kind: OfficeTemplateKind.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(officeTemplates)
        .orderBy(desc(officeTemplates.updatedAt))
        .limit(200);
      if (input?.kind) return rows.filter((r) => r.kind === input.kind);
      return rows;
    }),

  createTemplate: protectedProcedure.input(OfficeTemplateCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(officeTemplates)
      .values({
        kind: input.kind,
        title: input.title,
        body: input.body,
        tags: input.tags ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "office_template",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  removeTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(officeTemplates).where(eq(officeTemplates.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(officeTemplates).where(eq(officeTemplates.id, input.id));
      await writeAudit(ctx.db, {
        entity: "office_template",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),

  /** Bump version + record issue row with revision/impact notes. */
  revise: protectedProcedure.input(DocumentReviseInput).mutation(async ({ ctx, input }) => {
    const { entityType, entityId, revisionNote, impactNote } = input;

    if (entityType === "INSPECTION") {
      const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, entityId));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const versionNo = (row.versionNo ?? 1) + 1;
      await ctx.db
        .update(inspections)
        .set({ versionNo, status: "DRAFT", pdfStatus: "NONE", pdfKey: null })
        .where(eq(inspections.id, entityId));
      await recordDocumentIssue(ctx.db, {
        entityType,
        entityId,
        projectId: row.projectId,
        ref: row.ref,
        versionNo,
        revisionNote,
        impactNote,
        issuedById: ctx.user.id,
      });
      await writeAudit(ctx.db, {
        entity: "inspection",
        entityId,
        action: "REVISE",
        actorId: ctx.user.id,
        after: { versionNo, revisionNote, impactNote },
      });
      return { versionNo };
    }

    if (entityType === "SPEC_SHEET") {
      const [row] = await ctx.db.select().from(specSheets).where(eq(specSheets.id, entityId));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const versionNo = (row.versionNo ?? 1) + 1;
      await ctx.db
        .update(specSheets)
        .set({
          versionNo,
          status: "DRAFT",
          revisionNote,
          pdfStatus: "NONE",
          pdfKey: null,
        })
        .where(eq(specSheets.id, entityId));
      await recordDocumentIssue(ctx.db, {
        entityType,
        entityId,
        projectId: row.projectId,
        ref: row.ref,
        versionNo,
        revisionNote,
        impactNote,
        issuedById: ctx.user.id,
      });
      await writeAudit(ctx.db, {
        entity: "specsheet",
        entityId,
        action: "REVISE",
        actorId: ctx.user.id,
        after: { versionNo, revisionNote, impactNote },
      });
      return { versionNo };
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Revision workflow not supported for ${entityType}`,
    });
  }),
});
