import { type Capability, can } from "@esti/contracts";
import { initTRPC, TRPCError } from "@trpc/server";
import { env } from "../env.js";
import { firmPlan, licenseBlocked } from "../lib/plan.js";
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
  "users.totpSetup",
  "users.totpEnable",
  "users.totpDisable",
]);

// Mutations still allowed when the install's license is lapsed/absent, so the
// owner can recover (activate a license) and everyone can still sign out.
const LICENSE_GATE_ALLOW = new Set([
  "auth.logout",
  "license.activate",
  "license.refresh",
  "users.changePassword",
  "users.updateProfile",
]);

/** Any authenticated user (staff or portal client). Internal base only. */
// The only mutations a must-rotate account may perform before setting a new
// password — the change itself and signing out.
const PASSWORD_ROTATE_ALLOW = new Set(["users.changePassword", "auth.logout"]);

const authedProcedure = t.procedure.use(async ({ ctx, next, type, path }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  // Preloaded/community accounts must rotate their password first — block every
  // mutation except the change itself (and logout) until they do.
  if (ctx.user.mustChangePassword && type === "mutation" && !PASSWORD_ROTATE_ALLOW.has(path)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "password_change_required" });
  }
  if (ctx.user.isDemo && type === "mutation" && DEMO_BLOCKED_MUTATIONS.has(path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Managing users and credentials is disabled on the demo account.",
    });
  }
  // License gate (Phase B, node only): block writes on a managed install whose
  // license is expired-past-grace or absent. Unmanaged dev/CI installs pass.
  if (
    type === "mutation" &&
    env.ESTI_ROLE === "node" &&
    !LICENSE_GATE_ALLOW.has(path) &&
    (await licenseBlocked(ctx.db))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This workspace is not licensed (or the licence has lapsed). Activate a licence to continue.",
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
  "users.totpSetup",
  "users.totpEnable",
  "users.totpDisable",
  "dashboard.saveLayout",
  // Usage-earned identity (Phase 34) — every login, incl. read-only, self-tracks.
  "usage.ping",
  "usage.dismissIdPrompt",
  "usage.generateAormsId",
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
  if (ctx.user.role === "CONTRACTOR") throw new TRPCError({ code: "FORBIDDEN" });
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

/** Requires a contractor portal user (role CONTRACTOR scoped to a contractor). */
export const contractorProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "CONTRACTOR" || !ctx.user.contractorId)
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: { ...ctx.user, contractorId: ctx.user.contractorId } } });
});

/**
 * Contractor portal write actions (bidding, acknowledgements, coordination,
 * running bills). On the fixed Lite plan the contractor portal is view-only,
 * so these are blocked; Core+ allows the full two-way workflow.
 */
export const contractorWriteProcedure = contractorProcedure.use(async ({ ctx, next }) => {
  if ((await firmPlan(ctx.db)) === "LITE") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The contractor portal is view-only on the Lite plan.",
    });
  }
  return next({ ctx });
});

/** ESTICAD device bearer writes — takeoff, drawing link, scale calibration. */
export const companionWriteProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.deviceSessionId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Companion write requires ESTICAD device authentication.",
    });
  }
  if (!can(ctx.user.role, "write")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Companion write requires staff write access" });
  }
  return next({ ctx });
});
