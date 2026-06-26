import { can } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../trpc/trpc.js";

/** Accessible by SITE_SUPERVISOR role OR any staff with the site_portal capability. */
export const siteProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const hasSiteAccess =
    ctx.user.role === "SITE_SUPERVISOR" || can(ctx.user.role, "site_portal");
  if (!hasSiteAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Site portal access required" });
  return next();
});
