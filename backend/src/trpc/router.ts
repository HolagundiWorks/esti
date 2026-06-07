import { GST_RATES, SAC_CODES } from "@esti/contracts";
import { approvalRouter } from "../modules/approval/router.js";
import { authRouter } from "../modules/auth/router.js";
import { bbsRouter } from "../modules/boq/bbs.js";
import { dsrRouter } from "../modules/boq/dsr.js";
import { estimateRouter } from "../modules/boq/estimate.js";
import { bylawCalcRouter } from "../modules/bylaw/calc.js";
import { bylawRouter } from "../modules/bylaw/router.js";
import { engagementRouter } from "../modules/consultant/engagement.js";
import { collaboratorRouter } from "../modules/consultant/portal.js";
import { consultantRouter } from "../modules/consultant/router.js";
import { clientLogRouter } from "../modules/clientlog/log.js";
import { clientRouter } from "../modules/clientlog/router.js";
import { dashboardRouter } from "../modules/dashboard/router.js";
import { measurementRouter } from "../modules/drawing/measurement.js";
import { drawingRouter } from "../modules/drawing/router.js";
import { feeProposalRouter } from "../modules/feeproposal/router.js";
import { firmRouter } from "../modules/firm/router.js";
import { invoiceRouter } from "../modules/invoice/router.js";
import { notificationsRouter } from "../modules/notifications/router.js";
import { permitRouter } from "../modules/permit/router.js";
import { portalRouter } from "../modules/portal/router.js";
import { settingsRouter } from "../modules/settings/router.js";
import { leaveRouter, payrollRouter } from "../modules/team/hr.js";
import { assignmentRouter, teamRouter } from "../modules/team/router.js";
import { reconcileRouter } from "../modules/reconcile/router.js";
import { phaseRouter } from "../modules/phase/router.js";
import { projectOfficeRouter } from "../modules/projectoffice/router.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, service: "esti-aorms-backend", ts: Date.now() })),

  /** Fixed India profile surfaced to the SPA (read-only). */
  profile: publicProcedure.query(() => ({
    currency: "INR" as const,
    financialYearStart: "04-01",
    gstRates: GST_RATES,
    sacCodes: SAC_CODES,
  })),

  auth: authRouter,
  dashboard: dashboardRouter,
  clients: clientRouter,
  clientLog: clientLogRouter,
  projectOffice: projectOfficeRouter,
  phases: phaseRouter,
  feeProposals: feeProposalRouter,
  invoices: invoiceRouter,
  permits: permitRouter,
  bylaws: bylawRouter,
  bylawCalc: bylawCalcRouter,
  dsr: dsrRouter,
  estimates: estimateRouter,
  bbs: bbsRouter,
  approvals: approvalRouter,
  consultants: consultantRouter,
  engagements: engagementRouter,
  collab: collaboratorRouter,
  drawings: drawingRouter,
  measurements: measurementRouter,
  reconcile: reconcileRouter,
  portal: portalRouter,
  settings: settingsRouter,
  firm: firmRouter,
  notifications: notificationsRouter,
  team: teamRouter,
  assignments: assignmentRouter,
  leaves: leaveRouter,
  payroll: payrollRouter,
});

/** Exported type only — the SPA imports this for end-to-end type safety. */
export type AppRouter = typeof appRouter;
