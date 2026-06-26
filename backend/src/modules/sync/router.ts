import { drainOutbox, outboxStatus } from "../../lib/sync/outbox.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

/** Node-side sync controls — outbox status + a manual flush to the hub. */
export const syncRouter = router({
  status: protectedProcedure.query(({ ctx }) => outboxStatus(ctx.db)),
  flush: ownerProcedure.mutation(({ ctx }) => drainOutbox(ctx.db)),
});
