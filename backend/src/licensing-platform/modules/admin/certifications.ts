import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import {
  accountIdFromPublicId,
  issueCertification,
  listCertifications,
  setCertificationStatus,
} from "../portable/service.js";

/** Platform-admin issuance + management of portable certifications (AORMS-U keyed). */
export const certificationsRouter = router({
  list: platformAdminProcedure
    .input(z.object({ accountPublicId: z.string() }))
    .query(async ({ input }) => listCertifications(input.accountPublicId.trim().toUpperCase())),

  issue: platformAdminProcedure
    .input(
      z.object({
        accountPublicId: z.string(),
        title: z.string().min(1),
        issuer: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const handle = input.accountPublicId.trim().toUpperCase();
      const accountId = await accountIdFromPublicId(handle);
      if (!accountId) throw new Error("account_not_found");
      return issueCertification({ accountPublicId: handle, title: input.title, issuer: input.issuer });
    }),

  setStatus: platformAdminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["ACTIVE", "REVOKED"]) }))
    .mutation(async ({ input }) => {
      await setCertificationStatus(input.id, input.status);
      return { ok: true };
    }),
});
