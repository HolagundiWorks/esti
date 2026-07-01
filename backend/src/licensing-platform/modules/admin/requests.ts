import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import {
  fulfilRequest,
  listRequests,
  pendingRequestCount,
  rejectRequest,
} from "../request/service.js";

/** Platform-admin queue for self-serve plan requests. */
export const requestsRouter = router({
  list: platformAdminProcedure.query(async () => listRequests()),

  pendingCount: platformAdminProcedure.query(async () => pendingRequestCount()),

  /** Fulfil a request: create the licence + email the key from the portal. */
  fulfil: platformAdminProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const res = await fulfilRequest(input.requestId, ctx.account.email);
      if (!res.ok) throw new Error(res.error);
      return { key: res.key, emailed: res.emailed, emailReason: res.emailReason };
    }),

  reject: platformAdminProcedure
    .input(z.object({ requestId: z.string(), note: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await rejectRequest(input.requestId, ctx.account.email, input.note);
      return { ok: true };
    }),
});
