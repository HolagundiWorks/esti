import { buildReleaseInfo } from "../../lib/releaseInfo.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";

/** Production readiness — build revision and dependency health (owner only). */
export const systemRouter = router({
  release: ownerProcedure.query(async ({ ctx }) => buildReleaseInfo(ctx.db)),
});
