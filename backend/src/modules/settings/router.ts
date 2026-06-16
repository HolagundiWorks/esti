import { ArchiveTeamModuleInput, EscalationSettings } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
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
  /** Office feature flags — any staff member may read. */
  get: protectedProcedure.query(async ({ ctx }) => getOrgSettings(ctx.db)),

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
});
