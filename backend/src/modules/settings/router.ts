import {
  ArchiveTeamModuleInput,
  EscalationSettings,
  Plan,
  UploadSecuritySettingsInput,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "../../auth/session.js";
import { orgSettings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import {
  archiveTeamModule,
  assessHrModule,
  disableHrModuleSimple,
  enableStudioHrMode,
  listHrArchives,
} from "../../lib/hrMode.js";
import { getOrgSettings } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const settingsRouter = router({
  /** Office feature flags — any staff member may read (upload hash never exposed). */
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await getOrgSettings(ctx.db);
    const { uploadPasswordHash, ...safe } = row;
    return {
      ...safe,
      uploadPasswordConfigured: Boolean(uploadPasswordHash),
    };
  }),

  /** Team & HR module status — lock reasons, counts, archive history. */
  hrModuleStatus: protectedProcedure.query(async ({ ctx }) => {
    const assessment = await assessHrModule(ctx.db);
    const archives = await listHrArchives(ctx.db, 5);
    return { ...assessment, archives };
  }),

  /** Toggle the optional Team & HR module (owner only). Simple path when no archive required. */
  setHrEnabled: ownerProcedure
    .input(z.object({ hrEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.hrEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team mode is always enabled for this workspace.",
        });
      }
      const current = await getOrgSettings(ctx.db);
      let soloSummary: { tasksUpdated: number; projectsTouched: number } | null = null;
      let membersReactivated = 0;

      if (current.hrEnabled && !input.hrEnabled) {
        soloSummary = await disableHrModuleSimple(ctx.db);
      } else if (!current.hrEnabled && input.hrEnabled) {
        const result = await enableStudioHrMode(ctx.db);
        membersReactivated = result.membersReactivated;
      } else if (current.hrEnabled === input.hrEnabled) {
        return { ...current, soloSummary: null, membersReactivated: 0 };
      }

      const [row] = await ctx.db
        .select()
        .from(orgSettings)
        .where(eq(orgSettings.id, current.id))
        .limit(1);

      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { hrEnabled: current.hrEnabled, orgMode: current.orgMode },
        after: {
          hrEnabled: row!.hrEnabled,
          orgMode: row!.orgMode,
          soloSummary,
          membersReactivated,
        },
      });
      return { ...row!, soloSummary, membersReactivated };
    }),

  /**
   * Owner switches the firm's subscription edition (self-hosted / single-firm
   * install — the plan reflects the firm's license; billing is handled out of
   * band). Upgrades unlock features and raise seat/quota caps immediately.
   */
  setPlan: ownerProcedure
    .input(z.object({ plan: Plan }))
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ plan: input.plan, updatedAt: new Date() })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { plan: current.plan },
        after: { plan: input.plan },
      });
      const { uploadPasswordHash, ...safe } = row!;
      return { ...safe, uploadPasswordConfigured: Boolean(uploadPasswordHash) };
    }),

  /** Toggle the optional PMC module (owner only). */
  setPmcEnabled: ownerProcedure
    .input(z.object({ pmcEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ pmcEnabled: input.pmcEnabled, updatedAt: new Date() })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { pmcEnabled: current.pmcEnabled },
        after: { pmcEnabled: input.pmcEnabled },
      });
      return row!;
    }),

  /**
   * Archive Team & HR before switching a studio to solo mode.
   * Required when operational team data exists (attendance, roster, etc.).
   */
  archiveTeamModule: ownerProcedure
    .input(ArchiveTeamModuleInput)
    .mutation(async ({ ctx, input }) => {
      const result = await archiveTeamModule(ctx.db, ctx.user.id, input.reason);
      const current = await getOrgSettings(ctx.db);
      await writeAudit(ctx.db, {
        entity: "hr_archive",
        entityId: result.archiveId,
        action: "CREATE",
        actorId: ctx.user.id,
        after: result,
      });
      return { ...result, hrEnabled: current.hrEnabled, orgMode: current.orgMode };
    }),

  /** Toggle a module-group switch — financial / project / admin (owner only). */
  setModuleEnabled: ownerProcedure
    .input(z.object({ module: z.enum(["financial", "project", "admin"]), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const column = (
        { financial: "financialEnabled", project: "projectEnabled", admin: "adminEnabled" } as const
      )[input.module];
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ [column]: input.enabled })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { [column]: current[column] },
        after: { [column]: input.enabled },
      });
      return row!;
    }),

  /** Owner-configured alert escalation thresholds and digest behaviour. */
  setEscalationSettings: ownerProcedure
    .input(EscalationSettings)
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ escalationSettings: input })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { escalationSettings: current.escalationSettings },
        after: { escalationSettings: input },
      });
      return row!;
    }),

  /** Require a shared password for REST file uploads (owner only). */
  setUploadSecurity: ownerProcedure
    .input(UploadSecuritySettingsInput)
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const enabling = input.uploadPasswordRequired;
      const hasHash = Boolean(current.uploadPasswordHash);

      if (enabling && !hasHash && !input.uploadPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Set an upload password when enabling upload protection.",
        });
      }

      let uploadPasswordHash = current.uploadPasswordHash;
      if (input.uploadPassword) {
        uploadPasswordHash = await hashPassword(input.uploadPassword);
      }
      if (!enabling) {
        uploadPasswordHash = null;
      }

      const [row] = await ctx.db
        .update(orgSettings)
        .set({
          uploadPasswordRequired: enabling,
          uploadPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(orgSettings.id, current.id))
        .returning();

      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: {
          uploadPasswordRequired: current.uploadPasswordRequired,
          uploadPasswordConfigured: Boolean(current.uploadPasswordHash),
        },
        after: {
          uploadPasswordRequired: enabling,
          uploadPasswordConfigured: Boolean(uploadPasswordHash),
        },
      });

      const { uploadPasswordHash: _hash, ...safe } = row!;
      return {
        ...safe,
        uploadPasswordConfigured: Boolean(uploadPasswordHash),
      };
    }),
});
