import {
  ArchiveTeamModuleInput,
  EscalationSettings,
  StorageSettingsInput,
  UploadSecuritySettingsInput,
  WellnessSettings,
  parseStorageSettings,
  storageConfigError,
  toPublicStorageSettings,
  type StorageSettings,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "../../auth/session.js";
import { orgSettings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { invalidateStorageCache, probeStorage } from "../../lib/storage.js";
import {
  archiveTeamModule,
  assessHrModule,
  disableHrModuleSimple,
  enableStudioHrMode,
  listHrArchives,
} from "../../lib/hrMode.js";
import { getOrgSettings } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

/** Strip secrets from an org-settings row before returning it over the API. */
function publicSettings(row: typeof orgSettings.$inferSelect) {
  // Strip secrets: the upload-password hash, the BYOS S3 secret, and the
  // licensing credentials (the signed token + the sync bearer never leave here).
  const { uploadPasswordHash, storageSettings, licenseToken, syncToken, ...safe } = row;
  return {
    ...safe,
    storageSettings: toPublicStorageSettings(parseStorageSettings(storageSettings)),
    uploadPasswordConfigured: Boolean(uploadPasswordHash),
    licenseConfigured: Boolean(licenseToken),
  };
}

export const settingsRouter = router({
  /** Office feature flags — any staff member may read (secrets never exposed). */
  get: protectedProcedure.query(async ({ ctx }) => publicSettings(await getOrgSettings(ctx.db))),

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
      return { ...publicSettings(row!), soloSummary, membersReactivated };
    }),

  // The plan is no longer owner-settable — it is derived from the firm's signed
  // license (Phase B). See the `license` router (status/activate/refresh) and
  // `lib/plan.ts` `licenseState`. `setPlan` was removed.

  // ── BYOS — bring-your-own-storage (Core+) ─────────────────────────────────
  /** Current storage config (owner only; the S3 secret is never returned). */
  getStorage: ownerProcedure.query(async ({ ctx }) => {
    const org = await getOrgSettings(ctx.db);
    return toPublicStorageSettings(parseStorageSettings(org.storageSettings));
  }),

  /**
   * Point the firm's object storage at their own NAS / S3 (Core+). A NAS path or
   * S3 endpoint+bucket must be supplied for those modes. An omitted S3 secret
   * preserves the stored one. Invalidates the storage backend cache immediately.
   */
  setStorage: ownerProcedure.input(StorageSettingsInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "byos");
    const err = storageConfigError(input);
    if (err) throw new TRPCError({ code: "BAD_REQUEST", message: err });

    const org = await getOrgSettings(ctx.db);
    const prev = parseStorageSettings(org.storageSettings);
    const next: StorageSettings = {
      mode: input.mode,
      nasPath: input.nasPath,
      s3Endpoint: input.s3Endpoint,
      s3Region: input.s3Region,
      s3Bucket: input.s3Bucket,
      s3AccessKey: input.s3AccessKey,
      // Preserve the existing secret when the form leaves it blank.
      s3SecretKey: input.s3SecretKey?.trim() ? input.s3SecretKey : prev.s3SecretKey,
    };

    const [row] = await ctx.db
      .update(orgSettings)
      .set({ storageSettings: next, updatedAt: new Date() })
      .where(eq(orgSettings.id, org.id))
      .returning();
    invalidateStorageCache();
    await writeAudit(ctx.db, {
      entity: "settings",
      entityId: org.id,
      action: "STORAGE_CONFIG",
      actorId: ctx.user.id,
      before: { mode: prev.mode },
      after: { mode: next.mode, s3Bucket: next.s3Bucket, s3Endpoint: next.s3Endpoint, nasPath: next.nasPath },
    });
    return toPublicStorageSettings(parseStorageSettings(row!.storageSettings));
  }),

  /** Validate a candidate storage config by round-tripping a probe object. */
  testStorage: ownerProcedure.input(StorageSettingsInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "byos");
    const org = await getOrgSettings(ctx.db);
    const prev = parseStorageSettings(org.storageSettings);
    const candidate: StorageSettings = {
      ...input,
      s3SecretKey: input.s3SecretKey?.trim() ? input.s3SecretKey : prev.s3SecretKey,
    };
    return probeStorage(candidate);
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
      return publicSettings(row!);
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
      return publicSettings(row!);
    }),

  /** Firm wellness — snack/lunch break reminder times (owner only). */
  setWellness: ownerProcedure
    .input(WellnessSettings)
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ wellness: input, updatedAt: new Date() })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { wellness: current.wellness },
        after: { wellness: input },
      });
      return publicSettings(row!);
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
      return publicSettings(row!);
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

      return publicSettings(row!);
    }),
});
