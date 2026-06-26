import { GST_RATES, SAC_CODES } from "@esti/contracts";
import { adminRouter } from "../modules/admin/router.js";
import { auditRouter } from "../modules/audit/router.js";
import { activityRouter } from "../modules/activity/router.js";
import { commentRouter } from "../modules/comment/router.js";
import { criticalNoteRouter } from "../modules/criticalNote/router.js";
import { decisionRouter } from "../modules/decision/router.js";
import { approvalRouter } from "../modules/approval/router.js";
import { authRouter } from "../modules/auth/router.js";
import { bbsRouter } from "../modules/boq/bbs.js";
import { componentRouter } from "../modules/boq/component.js";
import { designEstimateRouter } from "../modules/boq/designEstimate.js";
import { workPackageRouter } from "../modules/boq/workPackage.js";
import { dsrRouter } from "../modules/boq/dsr.js";
import { estimateRouter } from "../modules/boq/estimate.js";
import { rateAnalysisRouter } from "../modules/boq/rate-analysis.js";
import { engagementRouter } from "../modules/consultant/engagement.js";
import { consultantRequestsRouter } from "../modules/consultant/inbox.js";
import { collaboratorRouter } from "../modules/consultant/portal.js";
import { consultantRouter } from "../modules/consultant/router.js";
import { contractorRouter } from "../modules/contractor/router.js";
import { constructionRouter } from "../modules/contractor/construction.js";
import { contractorPortalRouter } from "../modules/contractor/portal.js";
import { tenderRouter } from "../modules/contractor/tender.js";
import { clientLogRouter } from "../modules/clientlog/log.js";
import { clientRouter } from "../modules/clientlog/router.js";
import { leadsRouter } from "../modules/projectos/leads.js";
import { projectDnaRouter } from "../modules/projectos/dna.js";
import { assessmentRouter } from "../modules/projectos/assessment.js";
import { feasibilityRouter } from "../modules/projectos/feasibility.js";
import { negotiationRouter } from "../modules/projectos/negotiation.js";
import { onboardingRouter } from "../modules/projectos/onboarding.js";
import { programRouter } from "../modules/projectos/program.js";
import { documentRouter } from "../modules/document/router.js";
import { momRouter } from "../modules/mom/router.js";
import { measurementRouter } from "../modules/drawing/measurement.js";
import { drawingRouter } from "../modules/drawing/router.js";
import { feeProposalRouter } from "../modules/feeproposal/router.js";
import { firmRouter } from "../modules/firm/router.js";
import { invoiceRouter } from "../modules/invoice/router.js";
import { notificationsRouter } from "../modules/notifications/router.js";
import { inspectionRouter } from "../modules/inspection/router.js";
import { contractRouter, letterRouter } from "../modules/office/router.js";
import { permitRouter } from "../modules/permit/router.js";
import { poRouter } from "../modules/po/router.js";
import { proposalRouter } from "../modules/proposal/router.js";
import { specRouter } from "../modules/spec/router.js";
import { clientRequestsRouter } from "../modules/portal/admin.js";
import { portalRouter } from "../modules/portal/router.js";
import { settingsRouter } from "../modules/settings/router.js";
import { licensingRouter } from "../modules/licensing/router.js";
import { licenseRouter } from "../modules/license/router.js";
import { syncRouter } from "../modules/sync/router.js";
import { taskRouter } from "../modules/task/router.js";
import { transmittalRouter } from "../modules/transmittal/router.js";
import { userRouter } from "../modules/users/router.js";
import { leaveRouter, payrollRouter } from "../modules/team/hr.js";
import { hrProfileRouter } from "../modules/team/hrProfile.js";
import { assignmentRouter, teamRouter, teamsRouter } from "../modules/team/router.js";
import { reconcileRouter } from "../modules/reconcile/router.js";
import { reportsRouter } from "../modules/reports/router.js";
import { phaseRouter } from "../modules/phase/router.js";
import { projectOfficeRouter } from "../modules/projectoffice/router.js";
import { workloadRouter } from "../modules/workload/router.js";
import { knowledgeBankRouter } from "../modules/knowledgebank/router.js";
import { specCatalogRouter } from "../modules/knowledgebank/specCatalog.js";
import { attendanceRouter } from "../modules/attendance/router.js";
import { appointmentRouter } from "../modules/appointment/router.js";
import { rewardRouter } from "../modules/reward/router.js";
import { aspRfRouter } from "../modules/asprf/router.js";
import {
  incrementLandingVisitCount,
  tryGetLandingVisitCount,
} from "../modules/landing/readModels.js";
import { dashboardRouter } from "../modules/dashboard/router.js";
import { lessonRouter } from "../modules/lesson/router.js";
import { searchRouter } from "../modules/search/router.js";
import { aiRouter } from "../modules/ai/router.js";
import { companionRouter } from "../modules/companion/router.js";
import { marketingRouter } from "../modules/marketing/router.js";
import { programmeRouter } from "../modules/programme/router.js";
import { pmcRouter } from "../modules/pmc/router.js";
import { snagsRouter } from "../modules/pmc/snags.js";
import { siteInstructionsRouter } from "../modules/pmc/siteInstructions.js";
import { progressReportsRouter } from "../modules/pmc/progressReports.js";
import { phaseProgressRouter } from "../modules/pmc/phaseProgress.js";
import { runningBillsRouter } from "../modules/pmc/runningBills.js";
import { measurementBookRouter } from "../modules/pmc/measurements.js";
import { deviationRouter, variationRouter } from "../modules/pmc/controls.js";
import { steelReconciliationRouter } from "../modules/pmc/steel.js";
import { finalAccountRouter } from "../modules/pmc/finalAccount.js";
import { grnRouter } from "../modules/pmc/grn.js";
import { siteVisitRouter } from "../modules/siteVisit/router.js";
import { constructionScheduleRouter } from "../modules/construction-schedule/router.js";
import { projectBriefRouter } from "../modules/project-brief/router.js";
import { accountsRouter } from "../modules/expense/accounts.js";
import { expensesRouter } from "../modules/expense/expenses.js";
import { systemRouter } from "../modules/system/router.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(async ({ ctx }) => {
    const landingVisits = await tryGetLandingVisitCount(ctx.db);
    return {
      ok: true,
      service: "esti-aorms-backend",
      ts: Date.now(),
      ...(landingVisits !== null ? { landingVisits } : {}),
    };
  }),

  /** Increment landing-page visit counter (once per browser session from the SPA). */
  recordLandingVisit: publicProcedure.mutation(async ({ ctx }) => ({
    visits: await incrementLandingVisitCount(ctx.db),
  })),

  /** Fixed India profile surfaced to the SPA (read-only). */
  profile: publicProcedure.query(() => ({
    currency: "INR" as const,
    financialYearStart: "04-01",
    gstRates: GST_RATES,
    sacCodes: SAC_CODES,
  })),

  auth: authRouter,
  dashboard: dashboardRouter,
  activity: activityRouter,
  comments: commentRouter,
  criticalNotes: criticalNoteRouter,
  decisions: decisionRouter,
  clients: clientRouter,
  clientLog: clientLogRouter,
  projectOffice: projectOfficeRouter,
  phases: phaseRouter,
  feeProposals: feeProposalRouter,
  invoices: invoiceRouter,
  permits: permitRouter,
  dsr: dsrRouter,
  estimates: estimateRouter,
  estimation: designEstimateRouter,
  workPackages: workPackageRouter,
  components: componentRouter,
  bbs: bbsRouter,
  rateAnalysis: rateAnalysisRouter,
  approvals: approvalRouter,
  transmittals: transmittalRouter,
  consultants: consultantRouter,
  contractors: contractorRouter,
  tenders: tenderRouter,
  contractorPortal: contractorPortalRouter,
  construction: constructionRouter,
  engagements: engagementRouter,
  collab: collaboratorRouter,
  consultantRequests: consultantRequestsRouter,
  drawings: drawingRouter,
  measurements: measurementRouter,
  reconcile: reconcileRouter,
  reports: reportsRouter,
  admin: adminRouter,
  audit: auditRouter,
  purchaseOrders: poRouter,
  proposals: proposalRouter,
  inspections: inspectionRouter,
  siteVisits: siteVisitRouter,
  spec: specRouter,
  letters: letterRouter,
  contracts: contractRouter,
  documents: documentRouter,
  moms: momRouter,
  search: searchRouter,
  lessons: lessonRouter,
  appointments: appointmentRouter,
  portal: portalRouter,
  clientRequests: clientRequestsRouter,
  settings: settingsRouter,
  licensing: licensingRouter,
  license: licenseRouter,
  sync: syncRouter,
  firm: firmRouter,
  users: userRouter,
  tasks: taskRouter,
  workload: workloadRouter,
  notifications: notificationsRouter,
  team: teamRouter,
  teams: teamsRouter,
  assignments: assignmentRouter,
  leaves: leaveRouter,
  payroll: payrollRouter,
  hrProfile: hrProfileRouter,
  knowledgeBank: knowledgeBankRouter,
  specCatalog: specCatalogRouter,
  attendance: attendanceRouter,
  aspRf: aspRfRouter,
  rewards: rewardRouter,
  ai: aiRouter,
  companion: companionRouter,
  marketing: marketingRouter,
  programme: programmeRouter,
  pmc: pmcRouter,
  snags: snagsRouter,
  siteInstructions: siteInstructionsRouter,
  progressReports: progressReportsRouter,
  phaseProgress: phaseProgressRouter,
  runningBills: runningBillsRouter,
  measurementBook: measurementBookRouter,
  deviations: deviationRouter,
  variations: variationRouter,
  steelReconciliation: steelReconciliationRouter,
  finalAccount: finalAccountRouter,
  grn: grnRouter,
  leads: leadsRouter,
  projectDna: projectDnaRouter,
  assessment: assessmentRouter,
  feasibility: feasibilityRouter,
  negotiation: negotiationRouter,
  onboarding: onboardingRouter,
  program: programRouter,
  constructionSchedule: constructionScheduleRouter,
  projectBrief: projectBriefRouter,
  accounts: accountsRouter,
  expenses: expensesRouter,
  system: systemRouter,
});

/** Exported type only — the SPA imports this for end-to-end type safety. */
export type AppRouter = typeof appRouter;
