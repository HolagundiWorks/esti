import { LicenseActivateInput } from "@esti/contracts";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { licenseState, toLicenseView } from "../../lib/plan.js";
import { writeAudit } from "../../lib/audit.js";
import { activate, refreshNow } from "./consumer.js";

/**
 * Node-side license consumer (Phase B). Distinct from the hub-side `licensing`
 * authority: this is how an install reads its own license + activates against
 * the hub. Plan + seats are derived from the verified token — there is no
 * owner-set plan toggle.
 */
export const licenseRouter = router({
  /** Current effective license state for the install (drives the gate + panel). */
  status: protectedProcedure.query(async ({ ctx }) => {
    return toLicenseView(await licenseState(ctx.db));
  }),

  /** Activate an entitlement key against the hub. Allowed even when gate-blocked. */
  activate: ownerProcedure.input(LicenseActivateInput).mutation(async ({ ctx, input }) => {
    const view = await activate(ctx.db, input.key);
    await writeAudit(ctx.db, {
      entity: "license",
      entityId: view.firmId ?? "license",
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { plan: view.plan, status: view.status, expiresAt: view.expiresAt },
    });
    return view;
  }),

  /** Force a license refresh from the hub now. */
  refresh: ownerProcedure.mutation(async ({ ctx }) => {
    await refreshNow(ctx.db);
    return toLicenseView(await licenseState(ctx.db));
  }),
});
