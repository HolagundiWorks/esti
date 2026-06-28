import { createHash } from "node:crypto";
import { CompanionLinkDrawing } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { listActiveDeviceSessions, revokeDeviceSession } from "../../auth/device.js";
import { drawings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { publishEntity } from "../../lib/sync/publish.js";
import { assertCompanionTakeoff } from "../../lib/companion/writeGate.js";
import { resolveCompanionCapabilities } from "../../lib/companion/capabilities.js";
import { nextRef } from "../../lib/numbering.js";
import { requireProject } from "../../lib/projectScope.js";
import {
  companionWriteProcedure,
  ownerProcedure,
  protectedProcedure,
  router,
} from "../../trpc/trpc.js";

export const companionRouter = router({
  capabilities: protectedProcedure.query(async ({ ctx }) => {
    return resolveCompanionCapabilities(ctx.db, ctx.user!);
  }),

  /** Create or return a drawing record without DXF upload (ESTILINK). */
  linkDrawing: companionWriteProcedure
    .input(CompanionLinkDrawing)
    .mutation(async ({ ctx, input }) => {
      await assertCompanionTakeoff(ctx);
      await requireProject(ctx.db, input.projectId);

      if (input.drawingId) {
        const [existing] = await ctx.db
          .select()
          .from(drawings)
          .where(and(eq(drawings.id, input.drawingId), eq(drawings.projectId, input.projectId)))
          .limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Drawing not found" });
        return existing;
      }

      const { ref } = await nextRef(ctx.db, "drawing", "DRW");
      const placeholder = createHash("sha256")
        .update(`esticad-link:${input.projectId}:${ref}:${Date.now()}`)
        .digest("hex");

      const [row] = await ctx.db
        .insert(drawings)
        .values({
          ref,
          projectId: input.projectId,
          title: input.title,
          fileName: `${input.title.replace(/\s+/g, "-").slice(0, 80)}.esti`,
          fileHash: placeholder,
          storageKey: `linked/${placeholder}`,
          sizeBytes: 0,
          status: "READY",
          isCurrent: true,
        })
        .returning();

      await writeAudit(ctx.db, {
        entity: "drawing",
        entityId: row!.id,
        action: "LINK_COMPANION",
        actorId: ctx.user.id,
        after: { projectId: input.projectId, ref, title: input.title },
      });
      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "drawing",
        objectId: row!.id,
        eventType: "drawing.linked",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Drawing linked from ESTICAD: ${row!.title}`,
      });
      // Hybrid sync (Phase B): a READY drawing is portal-shared finalized data.
      if (row!.status === "READY") await publishEntity(ctx.db, "drawing", row!.id);

      return row!;
    }),

  listDevices: ownerProcedure.query(async ({ ctx }) => {
    const rows = await listActiveDeviceSessions(ctx.db);
    return rows.map((row) => ({
      ...row,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }),

  revokeDevice: ownerProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await listActiveDeviceSessions(ctx.db);
      const session = rows.find((row) => row.id === input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Device session not found" });

      await revokeDeviceSession(ctx.db, input.sessionId);
      await writeAudit(ctx.db, {
        entity: "device_session",
        entityId: input.sessionId,
        action: "REVOKE_DEVICE",
        actorId: ctx.user.id,
        before: { deviceName: session.deviceName, userId: session.userId },
      });
      return { ok: true };
    }),
});
