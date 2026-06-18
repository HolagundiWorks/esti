import { TAKEOFF_CATALOG } from "@esti/contracts";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { resolveCompanionCapabilities } from "../../lib/companion/capabilities.js";

export const companionRouter = router({
  capabilities: protectedProcedure.query(async ({ ctx }) => {
    return resolveCompanionCapabilities(ctx.db, ctx.user);
  }),

  takeoffCatalog: protectedProcedure.query(() => {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: TAKEOFF_CATALOG,
    };
  }),
});

/** JSON payload for REST clients (ESTICAD C++ HTTP). */
export function takeoffCatalogPayload() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: TAKEOFF_CATALOG,
  };
}
