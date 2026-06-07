import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Any authenticated user (staff or portal client). Internal base only. */
const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Office (staff) procedures — OWNER or internal CONSULTANT. Rejected: CLIENT
 * portal users and external CONSULTANT collaborators (a CONSULTANT scoped to a
 * consultant record). Those use clientProcedure / collaboratorProcedure.
 */
export const protectedProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role === "CLIENT") throw new TRPCError({ code: "FORBIDDEN" });
  if (ctx.user.role === "CONSULTANT" && ctx.user.consultantId)
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** Requires the firm owner. */
export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "OWNER") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** Requires a portal client user (role CLIENT scoped to a client record). */
export const clientProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "CLIENT" || !ctx.user.clientId) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: { ...ctx.user, clientId: ctx.user.clientId } } });
});

/** Requires an external collaborator (role CONSULTANT scoped to a consultant). */
export const collaboratorProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "CONSULTANT" || !ctx.user.consultantId)
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: { ...ctx.user, consultantId: ctx.user.consultantId } } });
});
