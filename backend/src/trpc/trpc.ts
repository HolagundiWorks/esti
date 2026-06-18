import { type Capability, can } from "@esti/contracts";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Account and credential mutations a demo login may not perform.
const DEMO_BLOCKED_MUTATIONS = new Set([
  "clients.createPortalUser",
  "consultants.createLogin",
  "users.changePassword",
  "users.createStaff",
  "users.resetPassword",
  "users.setDisabled",
  "users.setRole",
  "users.updateProfile",
]);

/** Any authenticated user (staff or portal client). Internal base only. */
const authedProcedure = t.procedure.use(({ ctx, next, type, path }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.isDemo && type === "mutation" && DEMO_BLOCKED_MUTATIONS.has(path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Managing users and credentials is disabled on the demo account.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Mutations read-only staff may perform (ESTI agent is advisory — no writes/uploads).
const READ_STAFF_MUTATIONS = new Set(["ai.generate"]);

// Mutations a read-only (Viewer) staff member may still perform on themselves.
const SELF_SERVICE_MUTATIONS = new Set([
  "auth.logout",
  "users.updateProfile",
  "users.changePassword",
  "dashboard.saveLayout",
]);

/**
 * Office (staff) procedures — the staff ladder (OWNER/PARTNER/SENIOR/ASSOCIATE/
 * VIEWER) or a legacy internal CONSULTANT. Rejected: CLIENT portal users and
 * external CONSULTANT collaborators (a CONSULTANT scoped to a consultant
 * record). A Viewer (no "write" capability) is read-only: mutations are blocked
 * except a short self-service allowlist.
 */
export const protectedProcedure = authedProcedure.use(({ ctx, next, type, path }) => {
  if (ctx.user.role === "CLIENT") throw new TRPCError({ code: "FORBIDDEN" });
  if (ctx.user.role === "CONSULTANT" && ctx.user.consultantId)
    throw new TRPCError({ code: "FORBIDDEN" });
  if (type === "mutation" && !SELF_SERVICE_MUTATIONS.has(path) && !can(ctx.user.role, "write")) {
    if (!READ_STAFF_MUTATIONS.has(path)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your role has read-only access" });
    }
  }
  return next({ ctx });
});

/** A staff procedure that additionally requires a specific capability. */
export function capabilityProcedure(cap: Capability) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!can(ctx.user.role, cap)) throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  });
}

/** Requires the firm owner (firm + user administration). */
export const ownerProcedure = capabilityProcedure("firm:admin");

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
