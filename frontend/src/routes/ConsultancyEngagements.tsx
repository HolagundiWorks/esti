import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  CHECK_CATEGORY_LABEL,
  CHECK_CATEGORY_REQUIRED_STEPS,
  CONS_DELIVERABLE_STATUS_TAG,
  CONS_GRADE_LABEL,
  ConsGrade,
  CONS_ENGAGEMENT_STATUS_TAG,
  CONS_FEE_STAGE_STATUS_TAG,
  CONSULTANCY_BRIEF_TEMPLATES,
  CONSULTANCY_TYPE_LABEL,
  CONS_CRS_STATUS_TAG,
  CONS_INPUT_PACK_STATUS_TAG,
  CONS_CALC_PACKAGE_STATUS_TAG,
  CONS_PHASE_STATUS_TAG,
  CONS_RISK_STATUS_TAG,
  CONS_TQ_STATUS_TAG,
  CONS_VARIATION_STATUS_TAG,
  CheckCategory,
  ConsEngagementStatus,
  ConsPhaseStatus,
  ConsultancyType,
  CrsStatus,
  DeliverableStatus,
  ENGAGEMENT_MODEL_LABEL,
  ENGINEERING_DISCIPLINE_LABEL,
  EngagementModel,
  EngineeringDiscipline,
  FEE_MODEL_LABEL,
  FeeModel,
  FeeStageStatus,
  INPUT_PACK_KIND_LABEL,
  ISSUE_CLASS_LABEL,
  InputPackKind,
  InputPackStatus,
  CalcPackageStatus,
  IssueClass,
  MDR_DOC_TYPE_LABEL,
  MdrDocType,
  REVIEW_STEP_LABEL,
  RiskStatus,
  ReviewStepKind,
  TqStatus,
  VariationStatus,
  buildMdrDeliverableCode,
  formatINR,
  nextMdrSequence,
} from "@esti/contracts";
import { useScreenActions, type DockAction } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { EngagementCloseoutPanels } from "../components/consultancy/EngagementCloseoutPanels.js";
import { EngagementPreconPanels } from "../components/consultancy/EngagementPreconPanels.js";
import { InvoicePdfCell } from "../components/InvoicePdfCell.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot, StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const MODELS = EngagementModel.options;
const DISCIPLINES = EngineeringDiscipline.options;
const ISSUE_CLASSES = IssueClass.options;
const CHECK_CATEGORIES = CheckCategory.options;
const MDR_DOC_TYPES = MdrDocType.options;

/**
 * AORMS-Consultancy — Phase 0 "Living record" workspace (preview): engineering
 * engagements + the deliverable register. Register lifecycle only — the
 * originate→check→approve sign-off chain arrives with Phase 1.
 * Design: docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 */
export function ConsultancyEngagements() {
  const utils = trpc.useUtils();
  const [searchParams] = useSearchParams();
  const listQ = trpc.consultancy.engagements.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);
  const detailQ = trpc.consultancy.engagements.get.useQuery(
    { id: selectedId ?? "" },
    {
      enabled: !!selectedId,
      // Poll while the worker renders the register PDF.
      refetchInterval: (q) => {
        const st = q.state.data?.pdfStatus;
        return st === "PENDING" || st === "PROCESSING" ? 2500 : false;
      },
    },
  );

  const invalidate = () => {
    utils.consultancy.engagements.list.invalidate();
    if (selectedId) utils.consultancy.engagements.get.invalidate({ id: selectedId });
  };

  const createEngagement = trpc.consultancy.engagements.create.useMutation({
    meta: { errorTitle: "Couldn't create the engagement" },
    onSuccess: (row) => {
      invalidate();
      setSelectedId(row.id);
      setEngOpen(false);
    },
  });
  const updateEngagement = trpc.consultancy.engagements.update.useMutation({
    meta: { errorTitle: "Couldn't update the engagement" },
    onSuccess: invalidate,
  });
  const removeEngagement = trpc.consultancy.engagements.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the engagement" },
    onSuccess: () => {
      setSelectedId(null);
      invalidate();
    },
  });
  const createDeliverable = trpc.consultancy.deliverables.create.useMutation({
    meta: { errorTitle: "Couldn't add the deliverable" },
    onSuccess: () => {
      invalidate();
      setDelOpen(false);
    },
  });
  const updateDeliverable = trpc.consultancy.deliverables.update.useMutation({
    meta: { errorTitle: "Couldn't update the deliverable" },
    onSuccess: invalidate,
  });
  const removeDeliverable = trpc.consultancy.deliverables.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the deliverable" },
    onSuccess: invalidate,
  });
  // Phase 1 — the reliance engine.
  const recordStep = trpc.consultancy.reviews.record.useMutation({
    meta: { errorTitle: "Couldn't record the sign-off step" },
    onSuccess: invalidate,
  });
  const raiseTq = trpc.consultancy.tqs.raise.useMutation({
    meta: { errorTitle: "Couldn't raise the technical query" },
    onSuccess: () => {
      invalidate();
      setTqOpen(false);
    },
  });
  const answerTq = trpc.consultancy.tqs.answer.useMutation({
    meta: { errorTitle: "Couldn't record the answer" },
    onSuccess: () => {
      invalidate();
      setTqAnswerFor(null);
    },
  });
  const closeTq = trpc.consultancy.tqs.close.useMutation({
    meta: { errorTitle: "Couldn't close the technical query" },
    onSuccess: () => {
      invalidate();
      setTqCloseFor(null);
    },
  });
  const removeTq = trpc.consultancy.tqs.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the technical query" },
    onSuccess: invalidate,
  });
  // Phase 2 slice 3 — variations.
  const createVariation = trpc.consultancy.variations.create.useMutation({
    meta: { errorTitle: "Couldn't raise the variation" },
    onSuccess: () => {
      invalidate();
      setVoOpen(false);
    },
  });
  const approveVariation = trpc.consultancy.variations.approve.useMutation({
    meta: { errorTitle: "Couldn't approve the variation" },
    onSuccess: invalidate,
  });
  const rejectVariation = trpc.consultancy.variations.reject.useMutation({
    meta: { errorTitle: "Couldn't reject the variation" },
    onSuccess: invalidate,
  });
  const removeVariation = trpc.consultancy.variations.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the variation" },
    onSuccess: invalidate,
  });

  // Typed project brief — the design-basis parameter set.
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefDraft, setBriefDraft] = useState<Record<string, string>>({});
  const setBrief = trpc.consultancy.engagements.setBrief.useMutation({
    meta: { errorTitle: "Couldn't save the project brief" },
    onSuccess: () => {
      invalidate();
      setBriefOpen(false);
    },
  });

  // Typed scope — engagement phases.
  const setPhaseStatus = trpc.consultancy.phases.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update the phase" },
    onSuccess: invalidate,
  });
  const addPhase = trpc.consultancy.phases.add.useMutation({
    meta: { errorTitle: "Couldn't add the phase" },
    onSuccess: () => {
      invalidate();
      setPhaseOpen(false);
    },
  });
  const removePhase = trpc.consultancy.phases.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the phase" },
    onSuccess: invalidate,
  });

  // Phase 3 — defensibility layer.
  const insuranceQ = trpc.consultancy.insurance.get.useQuery();
  const recordPack = trpc.consultancy.inputPacks.record.useMutation({
    meta: { errorTitle: "Couldn't record the input pack" },
    onSuccess: () => {
      invalidate();
      setPackOpen(false);
    },
  });
  const setPackStatus = trpc.consultancy.inputPacks.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update the input pack" },
    onSuccess: invalidate,
  });
  const removePack = trpc.consultancy.inputPacks.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the input pack" },
    onSuccess: invalidate,
  });
  const recordCalc = trpc.consultancy.calcPackages.record.useMutation({
    meta: { errorTitle: "Couldn't record the calc package" },
    onSuccess: () => {
      invalidate();
      setCalcOpen(false);
    },
  });
  const setCalcStatus = trpc.consultancy.calcPackages.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update the calc package" },
    onSuccess: invalidate,
  });
  const removeCalc = trpc.consultancy.calcPackages.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the calc package" },
    onSuccess: invalidate,
  });
  const createRisk = trpc.consultancy.risks.create.useMutation({
    meta: { errorTitle: "Couldn't add the risk" },
    onSuccess: () => {
      invalidate();
      setRiskOpen(false);
    },
  });
  const updateRisk = trpc.consultancy.risks.update.useMutation({
    meta: { errorTitle: "Couldn't update the risk" },
    onSuccess: invalidate,
  });
  const removeRisk = trpc.consultancy.risks.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the risk" },
    onSuccess: invalidate,
  });
  const createReliance = trpc.consultancy.relianceLetters.create.useMutation({
    meta: { errorTitle: "Couldn't record the reliance letter" },
    onSuccess: () => {
      invalidate();
      setRelOpen(false);
    },
  });
  const removeReliance = trpc.consultancy.relianceLetters.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the reliance letter" },
    onSuccess: invalidate,
  });

  // Phase 4 — the internal agent (read-only; answers from the firm record).
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [precedentQ, setPrecedentQ] = useState("");
  const ask = trpc.consultancy.intelligence.ask.useMutation({
    meta: { errorTitle: "Couldn't reach the intelligence agent" },
    onSuccess: (res) => setAskAnswer(res.answer),
  });
  const precedentsQ = trpc.consultancy.intelligence.precedentSearch.useQuery(
    { query: precedentQ.trim() },
    { enabled: askOpen && precedentQ.trim().length >= 2 },
  );
  const [lineageFor, setLineageFor] = useState<string | null>(null);
  const lineageQ = trpc.consultancy.intelligence.deliverableLineage.useQuery(
    { deliverableId: lineageFor! },
    { enabled: !!lineageFor },
  );
  const [eomsFor, setEomsFor] = useState<string | null>(null);
  const [eomsText, setEomsText] = useState<string | null>(null);
  const eomsReview = trpc.consultancy.inputPacks.eomsReview.useMutation({
    meta: { errorTitle: "Couldn't run the EOMS review" },
    onSuccess: (res) => setEomsText(res.recommendation),
  });

  // SOP §7 — site field reports (G711 anatomy).
  const [frOpen, setFrOpen] = useState(false);
  const [frDate, setFrDate] = useState("");
  const [frWeather, setFrWeather] = useState("");
  const [frPersonnel, setFrPersonnel] = useState("");
  const [frWork, setFrWork] = useState("");
  const [frObservations, setFrObservations] = useState("");
  const [frNcs, setFrNcs] = useState("");
  const [frInstructions, setFrInstructions] = useState("");
  const [frNextVisit, setFrNextVisit] = useState("");
  const createFieldReport = trpc.consultancy.fieldReports.create.useMutation({
    meta: { errorTitle: "Couldn't record the site visit" },
    onSuccess: () => {
      invalidate();
      setFrOpen(false);
    },
  });
  const removeFieldReport = trpc.consultancy.fieldReports.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the field report" },
    onSuccess: invalidate,
  });

  // SOP §4 — CRS (comment resolution sheet) per deliverable.
  const [crsFor, setCrsFor] = useState<string | null>(null);
  const [crsReviewer, setCrsReviewer] = useState("");
  const [crsComment, setCrsComment] = useState("");
  const [crsRespondFor, setCrsRespondFor] = useState<string | null>(null);
  const [crsResponse, setCrsResponse] = useState("");
  const addCrs = trpc.consultancy.crs.add.useMutation({
    meta: { errorTitle: "Couldn't add the review comment" },
    onSuccess: () => {
      invalidate();
      setCrsComment("");
    },
  });
  const closeCrs = trpc.consultancy.crs.close.useMutation({
    meta: { errorTitle: "Couldn't close the review comment" },
    onSuccess: () => {
      invalidate();
      setCrsRespondFor(null);
      setCrsResponse("");
    },
  });

  // SOP slice 1 — revise issued deliverables (bumps revision, resets the chain).
  const startRevision = trpc.consultancy.deliverables.startRevision.useMutation({
    meta: { errorTitle: "Couldn't start the revision" },
    onSuccess: invalidate,
  });
  const recordIssueTransmittal = trpc.consultancy.deliverables.recordIssueTransmittal.useMutation({
    meta: { errorTitle: "Couldn't record the issue transmittal" },
    onSuccess: invalidate,
  });

  // Built-in PDF export.
  const exportPdf = trpc.consultancy.engagements.exportPdf.useMutation({
    meta: { errorTitle: "Couldn't start the PDF export" },
    onSuccess: invalidate,
  });

  // Phase 2 close — firm commercial health, trailing 30 days.
  const [analyticsPeriod] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 86400000);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  const analyticsQ = trpc.consultancy.analytics.summary.useQuery(analyticsPeriod);
  const capacityQ = trpc.consultancy.analytics.capacityOutlook.useQuery({ horizonMonths: 3 });

  // Phase 2 slice 2 — rate card + timesheets.
  const rateCardQ = trpc.consultancy.rateCards.list.useQuery();
  const setRates = trpc.consultancy.rateCards.set.useMutation({
    meta: { errorTitle: "Couldn't save the rate card" },
    onSuccess: () => {
      rateCardQ.refetch();
      setRatesOpen(false);
    },
  });
  const logTime = trpc.consultancy.timesheets.log.useMutation({
    meta: { errorTitle: "Couldn't log the time" },
    onSuccess: () => {
      invalidate();
      setTimeOpen(false);
    },
  });
  const removeTime = trpc.consultancy.timesheets.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the timesheet entry" },
    onSuccess: invalidate,
  });

  // Phase 2 — fee stages.
  const createFeeStage = trpc.consultancy.feeStages.create.useMutation({
    meta: { errorTitle: "Couldn't add the fee stage" },
    onSuccess: () => {
      invalidate();
      setFeeOpen(false);
    },
  });
  const markInvoiced = trpc.consultancy.feeStages.markInvoiced.useMutation({
    meta: { errorTitle: "Couldn't mark the stage invoiced" },
    onSuccess: invalidate,
  });
  const markPaid = trpc.consultancy.feeStages.markPaid.useMutation({
    meta: { errorTitle: "Couldn't mark the stage paid" },
    onSuccess: invalidate,
  });
  const approveTime = trpc.consultancy.timesheets.approve.useMutation({
    meta: { errorTitle: "Couldn't approve the timesheets" },
    onSuccess: invalidate,
  });
  const removeFeeStage = trpc.consultancy.feeStages.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the fee stage" },
    onSuccess: invalidate,
  });

  // New-engagement dialog state.
  const [engOpen, setEngOpen] = useState(false);
  const [engTitle, setEngTitle] = useState("");
  const [engModel, setEngModel] = useState<EngagementModel>("FULL_DESIGN");
  const [engConsType, setEngConsType] = useState<ConsultancyType | "">("STRUCTURAL");
  const [engDiscipline, setEngDiscipline] = useState<EngineeringDiscipline>("STRUCTURAL");
  // Custom-phase dialog.
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [phaseName, setPhaseName] = useState("");
  const [phaseScope, setPhaseScope] = useState("");
  const [engStage, setEngStage] = useState("");
  const [engReliance, setEngReliance] = useState("");

  // Log-time + rate-card dialogs (Phase 2 slice 2).
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeDate, setTimeDate] = useState("");
  const [timeHours, setTimeHours] = useState("");
  const [timeGrade, setTimeGrade] = useState<ConsGrade>("ENGINEER");
  const [timeDeliverableId, setTimeDeliverableId] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [ratesOpen, setRatesOpen] = useState(false);
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({});
  const [capDraft, setCapDraft] = useState<Record<string, string>>({});

  // Phase 3 dialogs (input pack / risk / reliance letter).
  const [packOpen, setPackOpen] = useState(false);
  const [packTitle, setPackTitle] = useState("");
  const [packKind, setPackKind] = useState<InputPackKind>("ARCHITECT_PACK");
  const [packSource, setPackSource] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcCode, setCalcCode] = useState("");
  const [calcTitle, setCalcTitle] = useState("");
  const [calcRevision, setCalcRevision] = useState("P01");
  const [calcTool, setCalcTool] = useState("");
  const [calcCodeRefs, setCalcCodeRefs] = useState("");
  const [calcDeliverableId, setCalcDeliverableId] = useState("");
  const [calcAssumptions, setCalcAssumptions] = useState("");
  const [riskOpen, setRiskOpen] = useState(false);
  const [riskTitle, setRiskTitle] = useState("");
  const [riskL, setRiskL] = useState("3");
  const [riskI, setRiskI] = useState("3");
  const [riskRL, setRiskRL] = useState("");
  const [riskRI, setRiskRI] = useState("");
  const [riskOwner, setRiskOwner] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");
  const [relOpen, setRelOpen] = useState(false);
  const [relBeneficiary, setRelBeneficiary] = useState("");
  const [relPurpose, setRelPurpose] = useState("");
  const [relIssuedOn, setRelIssuedOn] = useState("");
  const [relExpiresOn, setRelExpiresOn] = useState("");

  // Variation dialog (Phase 2 slice 3).
  const [voOpen, setVoOpen] = useState(false);
  const [voCode, setVoCode] = useState("");
  const [voTitle, setVoTitle] = useState("");
  const [voAmount, setVoAmount] = useState(""); // rupees → paise on submit
  const [voSourceTqId, setVoSourceTqId] = useState<string | undefined>(undefined);

  // Fee-stage dialog (Phase 2).
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeLabel, setFeeLabel] = useState("");
  const [feeAmount, setFeeAmount] = useState(""); // rupees; converted to paise on submit
  const [feeDeliverableId, setFeeDeliverableId] = useState<string>("");

  // TQ dialogs (raise / answer / close-with-evidence).
  const [tqOpen, setTqOpen] = useState(false);
  const [tqCode, setTqCode] = useState("");
  const [tqQuestion, setTqQuestion] = useState("");
  const [tqDueDate, setTqDueDate] = useState("");
  const [tqScopeImpact, setTqScopeImpact] = useState(false);
  const [tqAnswerFor, setTqAnswerFor] = useState<string | null>(null);
  const [tqAnswerText, setTqAnswerText] = useState("");
  const [tqCloseFor, setTqCloseFor] = useState<string | null>(null);
  const [tqCloseNote, setTqCloseNote] = useState("");

  // New-deliverable dialog state.
  const [delOpen, setDelOpen] = useState(false);
  const [delDocType, setDelDocType] = useState<MdrDocType>("CALCULATION");
  const [delTitle, setDelTitle] = useState("");
  const [delDiscipline, setDelDiscipline] = useState<EngineeringDiscipline>("STRUCTURAL");
  const [delRevision, setDelRevision] = useState("A");
  const [delIssueClass, setDelIssueClass] = useState<IssueClass>("FOR_INFORMATION");
  const [delCheckCategory, setDelCheckCategory] = useState<CheckCategory>("CAT1");

  const anyDialogOpen =
    engOpen || delOpen || tqOpen || feeOpen || timeOpen || ratesOpen || voOpen ||
    packOpen || riskOpen || relOpen || askOpen || phaseOpen || briefOpen || frOpen ||
    !!crsFor || !!eomsFor || !!tqAnswerFor || !!tqCloseFor;
  useScreenActions(
    anyDialogOpen
      ? []
      : ([
          {
            id: "cons-new-engagement",
            zone: "center",
            tone: "primary",
            label: "New engagement",
            icon: <AddIcon />,
            onClick: () => {
              setEngTitle("");
              setEngStage("");
              setEngReliance("");
              setEngOpen(true);
            },
          },
          ...(selectedId
            ? ([
                {
                  id: "cons-new-deliverable",
                  zone: "center",
                  label: "Add deliverable",
                  icon: <AddIcon />,
                  onClick: () => {
                    // SOP: document numbers hang off the job number; type picks the MDR slot.
                    setDelDocType("CALCULATION");
                    setDelTitle("");
                    setDelRevision("P01");
                    setDelOpen(true);
                  },
                },
                {
                  id: "cons-raise-tq",
                  zone: "center",
                  label: "Raise TQ",
                  icon: <AddIcon />,
                  onClick: () => {
                    setTqCode("");
                    setTqQuestion("");
                    // SLA default: contractual turnaround is typically 5–14 working days.
                    setTqDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
                    setTqScopeImpact(false);
                    setTqOpen(true);
                  },
                },
                {
                  id: "cons-add-fee-stage",
                  zone: "center",
                  label: "Add fee stage",
                  icon: <AddIcon />,
                  onClick: () => {
                    setFeeLabel("");
                    setFeeAmount("");
                    setFeeDeliverableId("");
                    setFeeOpen(true);
                  },
                },
                {
                  id: "cons-log-time",
                  zone: "center",
                  label: "Log time",
                  icon: <AddIcon />,
                  onClick: () => {
                    setTimeDate(new Date().toISOString().slice(0, 10));
                    setTimeHours("");
                    setTimeDeliverableId("");
                    setTimeNote("");
                    setTimeOpen(true);
                  },
                },
                {
                  id: "cons-ask-intelligence",
                  zone: "right",
                  tone: "primary",
                  label: "Ask intelligence",
                  onClick: () => {
                    setAskQuestion("");
                    setAskAnswer(null);
                    setPrecedentQ("");
                    setAskOpen(true);
                  },
                },
                {
                  id: "cons-rate-card",
                  zone: "right",
                  label: "Rate card",
                  onClick: () => {
                    const draft: Record<string, string> = {};
                    const caps: Record<string, string> = {};
                    for (const r of rateCardQ.data ?? []) {
                      draft[r.grade] = String((r.ratePaise ?? 0) / 100);
                      caps[r.grade] = String(r.capacityHoursWeek ?? 0);
                    }
                    setRateDraft(draft);
                    setCapDraft(caps);
                    setRatesOpen(true);
                  },
                },
              ] satisfies DockAction[])
            : []),
        ] satisfies DockAction[]),
    [anyDialogOpen, selectedId, rateCardQ.data],
  );

  const engagements = listQ.data ?? [];
  const detail = detailQ.data;

  const a = analyticsQ.data;
  const capacity = capacityQ.data;
  const showCommercial =
    !!a && (a.hoursBooked > 0 || a.invoicedPaise > 0);
  const showCapacity = !!capacity && capacity.alerts.length > 0;
  const showAside = showCommercial || showCapacity || !!insuranceQ.data;

  return (
    <RailLayout
      title="Engagements"
      description="AORMS-Consultancy · engineering workspace (preview)"
      aside={
        showAside ? (
          <Stack spacing={0.75}>
            {showCommercial && a && (
              <>
                <span className="esti-label">Commercial health · 30 days</span>
                <span className="esti-label esti-label--secondary">
                  {`${a.hoursBooked}h · value ${formatINR(a.timeValuePaise)}`}
                </span>
                <span className="esti-label esti-label--secondary">
                  {`WIP ${formatINR(a.wipPaise)} · billable ${formatINR(a.billablePaise)}`}
                </span>
                <span className="esti-label esti-label--secondary">
                  {`Invoiced ${formatINR(a.invoicedPaise)}${
                    a.realisation != null ? ` · realisation ${Math.round(a.realisation * 100)}%` : ""
                  }`}
                </span>
                {a.byGrade
                  .filter((g) => g.utilisation != null)
                  .map((g) => (
                    <span key={g.grade} className="esti-label esti-label--secondary">
                      {`${CONS_GRADE_LABEL[g.grade as ConsGrade] ?? g.grade}: ${Math.round(
                        (g.utilisation ?? 0) * 100,
                      )}% utilised`}
                    </span>
                  ))}
              </>
            )}
            {showCapacity && capacity && (
              <>
                <span
                  className="esti-label"
                  style={showCommercial ? { marginTop: 8 } : undefined}
                >
                  Capacity outlook · {capacity.horizonMonths} mo
                </span>
                {capacity.alerts.map((alert) => (
                  <span key={alert} className="esti-label esti-label--secondary">
                    {alert}
                  </span>
                ))}
              </>
            )}
            {insuranceQ.data && (
              <>
                <span
                  className="esti-label"
                  style={showCommercial || showCapacity ? { marginTop: 8 } : undefined}
                >
                  PI cover
                </span>
                <span className="esti-label esti-label--secondary">
                  {`${insuranceQ.data.insurer} · ${insuranceQ.data.policyNo}`}
                </span>
                <span className="esti-label esti-label--secondary">
                  {`Limit ${formatINR(insuranceQ.data.limitPaise ?? 0)} · to ${insuranceQ.data.periodTo}`}
                </span>
              </>
            )}
          </Stack>
        ) : undefined
      }
      actions={
        <Stack spacing={1} sx={{ width: 1 }}>
          <Button component={RouterLink} to="/consultancy/enquiries" size="small" variant="outlined" fullWidth>
            Enquiries
          </Button>
          <Button component={RouterLink} to="/consultancy/engagements" size="small" variant="contained" fullWidth>
            Engagements
          </Button>
        </Stack>
      }
    >
      <PageBreadcrumb items={[{ label: "Consultancy" }, { label: "Engagements" }]} />

      <Grid container spacing={2}>
        {/* Engagement list */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <DataState
            loading={listQ.isLoading}
            isEmpty={engagements.length === 0}
            columnCount={1}
            empty={{
              title: "No engagements",
              description:
                "Create the first engineering engagement — the living record every deliverable, query, and fee stage attaches to.",
            }}
          >
            <Stack spacing={0}>
              {engagements.map((e) => (
                <Box
                  key={e.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  aria-pressed={selectedId === e.id}
                  className="esti-fill"
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    p: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    borderLeft: 3,
                    borderLeftColor: selectedId === e.id ? "primary.main" : "transparent",
                  }}
                >
                  <Stack spacing={0.5}>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                      <Typography variant="subtitle2" component="h3" className="esti-grow">
                        {e.code ? `${e.code} · ` : ""}
                        {e.title}
                      </Typography>
                      <StatusTag
                        value={e.status as ConsEngagementStatus}
                        map={CONS_ENGAGEMENT_STATUS_TAG}
                      />
                    </Box>
                    <span className="esti-label esti-label--secondary">
                      {ENGAGEMENT_MODEL_LABEL[e.model as EngagementModel] ?? e.model} ·{" "}
                      {ENGINEERING_DISCIPLINE_LABEL[e.leadDiscipline as EngineeringDiscipline] ??
                        e.leadDiscipline}
                      {e.stage ? ` · ${e.stage}` : ""}
                    </span>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </DataState>
        </Grid>

        {/* Detail + deliverable register */}
        <Grid size={{ xs: 12, lg: 7 }}>
          {!selectedId || !detail ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Select an engagement to open its deliverable register.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                  <Stack spacing={0.5} className="esti-grow">
                    <Typography variant="h6" component="h2">
                      {detail.code ? `${detail.code} · ` : ""}
                      {detail.title}
                    </Typography>
                    <span className="esti-label esti-label--secondary">
                      {ENGAGEMENT_MODEL_LABEL[detail.model as EngagementModel] ?? detail.model}
                      {detail.consultancyType
                        ? ` · ${CONSULTANCY_TYPE_LABEL[detail.consultancyType as ConsultancyType] ?? detail.consultancyType}`
                        : ` · lead: ${ENGINEERING_DISCIPLINE_LABEL[detail.leadDiscipline as EngineeringDiscipline] ?? detail.leadDiscipline}`}
                      {detail.stage ? ` · ${detail.stage}` : ""}
                    </span>
                    {detail.relianceScope && (
                      <Typography variant="body2" color="text.secondary">
                        Reliance: {detail.relianceScope}
                      </Typography>
                    )}
                    {(detail.pdfStatus === "PENDING" || detail.pdfStatus === "PROCESSING") && (
                      <span className="esti-label esti-label--secondary">
                        Register PDF rendering…
                      </span>
                    )}
                    {detail.pdfStatus === "FAILED" && (
                      <span className="esti-label esti-label--secondary">
                        Register PDF failed — try exporting again.
                      </span>
                    )}
                    {detail.pdfUrl && (
                      <Box>
                        <Button
                          component="a"
                          href={detail.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                        >
                          Download register PDF
                        </Button>
                      </Box>
                    )}
                  </Stack>
                  <RowActionsMenu
                    actions={[
                      {
                        label:
                          detail.pdfStatus === "PENDING" || detail.pdfStatus === "PROCESSING"
                            ? "Export PDF (rendering…)"
                            : "Export register PDF",
                        disabled:
                          exportPdf.isPending ||
                          detail.pdfStatus === "PENDING" ||
                          detail.pdfStatus === "PROCESSING",
                        onClick: () => exportPdf.mutate({ id: detail.id }),
                      },
                      ...(detail.status !== "ON_HOLD"
                        ? [
                            {
                              label: "Put on hold",
                              onClick: () =>
                                updateEngagement.mutate({ id: detail.id, status: "ON_HOLD" }),
                            },
                          ]
                        : [
                            {
                              label: "Reactivate",
                              onClick: () =>
                                updateEngagement.mutate({ id: detail.id, status: "ACTIVE" }),
                            },
                          ]),
                      ...(detail.status !== "CLOSED"
                        ? [
                            {
                              label: "Close engagement",
                              onClick: () =>
                                updateEngagement.mutate({ id: detail.id, status: "CLOSED" }),
                            },
                          ]
                        : []),
                      {
                        label: "Delete",
                        danger: true,
                        disabled: removeEngagement.isPending,
                        onClick: () => removeEngagement.mutate({ id: detail.id }),
                      },
                    ]}
                  />
                </Stack>
              </Box>

              {/* Typed project brief — the design-basis parameter set, per consultancy type. */}
              {detail.consultancyType && (
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                      Project brief
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        const draft: Record<string, string> = {};
                        const current = (detail.brief ?? {}) as Record<string, unknown>;
                        for (const f of CONSULTANCY_BRIEF_TEMPLATES[
                          detail.consultancyType as ConsultancyType
                        ] ?? [])
                          draft[f.key] = current[f.key] != null ? String(current[f.key]) : "";
                        setBriefDraft(draft);
                        setBriefOpen(true);
                      }}
                    >
                      {detail.brief ? "Edit brief" : "Fill brief"}
                    </Button>
                  </Stack>
                  {!detail.brief ? (
                    <span className="esti-label esti-label--secondary">
                      No design-basis data recorded — the{" "}
                      {CONSULTANCY_TYPE_LABEL[detail.consultancyType as ConsultancyType]} brief
                      is the technical parameter set design starts from.
                    </span>
                  ) : (
                    <Grid container spacing={0.5} sx={{ mt: 0.25 }}>
                      {(CONSULTANCY_BRIEF_TEMPLATES[detail.consultancyType as ConsultancyType] ?? [])
                        .filter((f) => {
                          const v = (detail.brief as Record<string, unknown>)[f.key];
                          return v != null && String(v).trim() !== "";
                        })
                        .map((f) => {
                          const v = (detail.brief as Record<string, unknown>)[f.key];
                          return (
                            <Grid key={f.key} size={{ xs: 12, sm: 6, md: 4 }}>
                              <span className="esti-label esti-label--secondary">{f.label}</span>
                              <Typography variant="body2">
                                {f.kind === "boolean"
                                  ? v === true || v === "true"
                                    ? "Yes"
                                    : "No"
                                  : `${String(v)}${f.unit ? ` ${f.unit}` : ""}`}
                              </Typography>
                            </Grid>
                          );
                        })}
                    </Grid>
                  )}
                </Box>
              )}

              {/* Typed scope of work — the consultancy's time is bounded by these phases. */}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                    Scope of work
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setPhaseName("");
                      setPhaseScope("");
                      setPhaseOpen(true);
                    }}
                  >
                    Add phase
                  </Button>
                </Stack>
                {detail.phases.length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No scope recorded — pick a consultancy type at creation to seed the
                    typical phases, or add phases here. Work outside the recorded scope is
                    a variation.
                  </span>
                ) : (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {detail.phases.map((ph) => (
                      <Stack key={ph.id} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                        <Stack spacing={0.25} className="esti-grow">
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {ph.name}
                            </Typography>
                            <StatusTag
                              value={ph.status as ConsPhaseStatus}
                              map={CONS_PHASE_STATUS_TAG}
                            />
                          </Stack>
                          {Array.isArray(ph.scope) && ph.scope.length > 0 && (
                            <span className="esti-label esti-label--secondary">
                              {(ph.scope as string[]).join(" · ")}
                            </span>
                          )}
                        </Stack>
                        <RowActionsMenu
                          actions={[
                            ...(ph.status !== "ACTIVE"
                              ? [
                                  {
                                    label: "Start (set current stage)",
                                    onClick: () =>
                                      setPhaseStatus.mutate({ id: ph.id, status: "ACTIVE" }),
                                  },
                                ]
                              : []),
                            ...(ph.status !== "DONE"
                              ? [
                                  {
                                    label: "Mark done",
                                    onClick: () =>
                                      setPhaseStatus.mutate({ id: ph.id, status: "DONE" }),
                                  },
                                ]
                              : [
                                  {
                                    label: "Reopen",
                                    onClick: () =>
                                      setPhaseStatus.mutate({ id: ph.id, status: "PENDING" }),
                                  },
                                ]),
                            {
                              label: "Delete",
                              danger: true,
                              disabled: removePhase.isPending,
                              onClick: () => removePhase.mutate({ id: ph.id }),
                            },
                          ]}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* EOMS input gate — unvalidated packs hold issue on the whole engagement. */}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                    Input packs
                    {detail.inputPacks.some((p) => p.status === "RECEIVED") && (
                      <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
                        hold — validation pending
                      </Typography>
                    )}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setPackTitle("");
                      setPackSource("");
                      setPackOpen(true);
                    }}
                  >
                    Record input
                  </Button>
                </Stack>
                {detail.inputPacks.length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No external inputs recorded — packs are validated before they become
                    working assumptions; unvalidated packs hold issue.
                  </span>
                ) : (
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {detail.inputPacks.map((p) => (
                      <Stack key={p.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <StatusTag
                          value={p.status as InputPackStatus}
                          map={CONS_INPUT_PACK_STATUS_TAG}
                          label={`${p.title} · ${INPUT_PACK_KIND_LABEL[p.kind as InputPackKind] ?? p.kind}${
                            p.validatedByName ? ` · ${p.status.toLowerCase()} by ${p.validatedByName}` : ""
                          }`}
                        />
                        <Box className="esti-grow" />
                        <RowActionsMenu
                          actions={[
                            ...(p.status === "RECEIVED"
                              ? [
                                  {
                                    label: "EOMS review",
                                    disabled: eomsReview.isPending,
                                    onClick: () => {
                                      setEomsText(null);
                                      setEomsFor(p.title);
                                      eomsReview.mutate({ id: p.id });
                                    },
                                  },
                                  {
                                    label: "Validate",
                                    disabled: setPackStatus.isPending,
                                    onClick: () =>
                                      setPackStatus.mutate({ id: p.id, status: "VALIDATED" }),
                                  },
                                  {
                                    label: "Reject",
                                    disabled: setPackStatus.isPending,
                                    onClick: () =>
                                      setPackStatus.mutate({ id: p.id, status: "REJECTED" }),
                                  },
                                ]
                              : []),
                            {
                              label: "Delete",
                              danger: true,
                              disabled: removePack.isPending,
                              onClick: () => removePack.mutate({ id: p.id }),
                            },
                          ]}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* P9.4 / D4 — calc lineage (tools compute; AORMS records the trail). */}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                    Calc packages
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setCalcCode(detail.code ? `${detail.code}-CALC-` : "CALC-");
                      setCalcTitle("");
                      setCalcRevision("P01");
                      setCalcTool("");
                      setCalcCodeRefs("");
                      setCalcDeliverableId("");
                      setCalcAssumptions("");
                      setCalcOpen(true);
                    }}
                  >
                    Record calc
                  </Button>
                </Stack>
                {(detail.calcPackages ?? []).length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No calc packages — record software, code refs and assumptions so issue can cite
                    a reproducible trail (no in-app calculation engine).
                  </span>
                ) : (
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {(detail.calcPackages ?? []).map((c) => (
                      <Stack key={c.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <StatusTag
                          value={c.status as CalcPackageStatus}
                          map={CONS_CALC_PACKAGE_STATUS_TAG}
                          label={`${c.code} · ${c.title} · rev ${c.revision}${
                            c.softwareTool ? ` · ${c.softwareTool}` : ""
                          }${c.preparedByName ? ` · ${c.preparedByName}` : ""}`}
                        />
                        <Box className="esti-grow" />
                        <RowActionsMenu
                          actions={[
                            ...(c.status === "DRAFT"
                              ? [
                                  {
                                    label: "Mark current",
                                    disabled: setCalcStatus.isPending,
                                    onClick: () =>
                                      setCalcStatus.mutate({ id: c.id, status: "CURRENT" }),
                                  },
                                  {
                                    label: "Supersede",
                                    disabled: setCalcStatus.isPending,
                                    onClick: () =>
                                      setCalcStatus.mutate({ id: c.id, status: "SUPERSEDED" }),
                                  },
                                ]
                              : []),
                            ...(c.status === "CURRENT"
                              ? [
                                  {
                                    label: "Supersede",
                                    disabled: setCalcStatus.isPending,
                                    onClick: () =>
                                      setCalcStatus.mutate({ id: c.id, status: "SUPERSEDED" }),
                                  },
                                ]
                              : []),
                            {
                              label: "Delete",
                              danger: true,
                              disabled: c.status === "CURRENT" || removeCalc.isPending,
                              onClick: () => removeCalc.mutate({ id: c.id }),
                            },
                          ]}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>

              <TableContainer>
                <Table size="small" aria-label="Deliverable register">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Discipline</TableCell>
                      <TableCell>Rev</TableCell>
                      <TableCell>Issue class</TableCell>
                      <TableCell>Check</TableCell>
                      <TableCell>Sign-off</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Transmittal</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.deliverables.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <span className="esti-label esti-label--secondary">
                            Empty register — add the first deliverable package.
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {detail.deliverables.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.code}</TableCell>
                        <TableCell>{d.title}</TableCell>
                        <TableCell>
                          {ENGINEERING_DISCIPLINE_LABEL[d.discipline as EngineeringDiscipline] ??
                            d.discipline}
                        </TableCell>
                        <TableCell>{d.revision}</TableCell>
                        <TableCell>
                          {ISSUE_CLASS_LABEL[d.issueClass as IssueClass] ?? d.issueClass}
                        </TableCell>
                        <TableCell>{d.checkCategory}</TableCell>
                        <TableCell>
                          {/* Chain progress toward the category's required steps. */}
                          <span
                            className="esti-label esti-label--secondary"
                            title={
                              d.chain.length
                                ? d.chain
                                    .map(
                                      (s) =>
                                        `${REVIEW_STEP_LABEL[s.kind as ReviewStepKind] ?? s.kind}: ${s.userName}`,
                                    )
                                    .join(" · ")
                                : "No sign-off steps recorded"
                            }
                          >
                            {d.chain.length}/
                            {(CHECK_CATEGORY_REQUIRED_STEPS[d.checkCategory as CheckCategory] ?? [])
                              .length}
                            {d.status === "DRAFT" && d.missing.length > 0
                              ? ` · needs ${d.missing
                                  .map((k) =>
                                    (REVIEW_STEP_LABEL[k as ReviewStepKind] ?? k).toLowerCase(),
                                  )
                                  .join(", ")}`
                              : ""}
                            {d.crsOpen > 0 ? (
                              <span style={{ color: "var(--cds-support-error, #da1e28)" }}>
                                {` · CRS ${d.crsOpen} open`}
                              </span>
                            ) : (
                              ""
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusTag
                            value={d.status as DeliverableStatus}
                            map={CONS_DELIVERABLE_STATUS_TAG}
                          />
                        </TableCell>
                        <TableCell>
                          {d.issueTransmittal ? (
                            <span
                              className="esti-label esti-label--secondary"
                              title={
                                d.issueTransmittal.acknowledgedAt
                                  ? `Acknowledged by ${d.issueTransmittal.acknowledgedBy ?? "receiver"}`
                                  : "Awaiting receiver acknowledgment"
                              }
                            >
                              {d.issueTransmittal.ref}
                              {d.issueTransmittal.acknowledgedAt ? " · ack" : " · awaiting"}
                            </span>
                          ) : d.status === "ISSUED" ? (
                            <span className="esti-label esti-label--secondary">—</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <RowActionsMenu
                            actions={[
                              ...(d.status === "DRAFT"
                                ? (d.missing as string[]).map((k) => ({
                                    label: `Record: ${REVIEW_STEP_LABEL[k as ReviewStepKind] ?? k}`,
                                    disabled: recordStep.isPending,
                                    onClick: () =>
                                      recordStep.mutate({
                                        deliverableId: d.id,
                                        kind: k as ReviewStepKind,
                                      }),
                                  }))
                                : []),
                              {
                                label: `Review comments (CRS${d.crs.length ? ` · ${d.crs.length}` : ""})`,
                                onClick: () => {
                                  setCrsReviewer("");
                                  setCrsComment("");
                                  setCrsRespondFor(null);
                                  setCrsResponse("");
                                  setCrsFor(d.id);
                                },
                              },
                              {
                                label: "Sign-off lineage",
                                onClick: () => setLineageFor(d.id),
                              },
                              ...(d.status === "DRAFT"
                                ? [
                                    {
                                      label: "Mark issued",
                                      onClick: () =>
                                        updateDeliverable.mutate({ id: d.id, status: "ISSUED" }),
                                    },
                                  ]
                                : []),
                              ...(d.status === "ISSUED"
                                ? [
                                    ...(!d.issueTransmittal
                                      ? [
                                          {
                                            label: detail.projectId
                                              ? "Record issue transmittal"
                                              : "Record issue transmittal (link Studio project first)",
                                            disabled:
                                              !detail.projectId || recordIssueTransmittal.isPending,
                                            onClick: () =>
                                              recordIssueTransmittal.mutate({
                                                deliverableId: d.id,
                                              }),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: "Start revision (resets sign-off)",
                                      disabled: startRevision.isPending,
                                      onClick: () => startRevision.mutate({ id: d.id }),
                                    },
                                    {
                                      label: "Supersede",
                                      onClick: () =>
                                        updateDeliverable.mutate({
                                          id: d.id,
                                          status: "SUPERSEDED",
                                        }),
                                    },
                                  ]
                                : []),
                              ...(d.status !== "WITHDRAWN"
                                ? [
                                    {
                                      label: "Withdraw",
                                      onClick: () =>
                                        updateDeliverable.mutate({ id: d.id, status: "WITHDRAWN" }),
                                    },
                                  ]
                                : []),
                              {
                                label: "Delete",
                                danger: true,
                                disabled: removeDeliverable.isPending,
                                onClick: () => removeDeliverable.mutate({ id: d.id }),
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Fee position — stage billing tied to deliverable issue (Phase 2). */}
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Fee position
                </Typography>
                <span className="esti-label esti-label--secondary">
                  {detail.feePosition
                    ? (detail.feeModel
                        ? `${FEE_MODEL_LABEL[detail.feeModel as FeeModel] ?? detail.feeModel} · agreed ${formatINR(detail.feePosition.agreedPaise)}`
                        : "No fee model recorded") +
                      ` · staged ${formatINR(detail.feePosition.stagedPaise)} · billable ${formatINR(detail.feePosition.billablePaise)} · invoiced ${formatINR(detail.feePosition.invoicedPaise)} · paid ${formatINR(detail.feePosition.paidPaise)}` +
                      (detail.feePosition.outstandingPaise > 0
                        ? ` · outstanding ${formatINR(detail.feePosition.outstandingPaise)}`
                        : "")
                    : "Fee position is visible to finance roles only."}
                </span>
                {detail.feeStages.length > 0 && (
                  <TableContainer sx={{ mt: 1 }}>
                    <Table size="small" aria-label="Fee stages">
                      <TableHead>
                        <TableRow>
                          <TableCell>Stage</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Billing trigger</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Studio invoice</TableCell>
                          <TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.feeStages.map((f) => {
                          const linked = detail.deliverables.find((d) => d.id === f.deliverableId);
                          return (
                            <TableRow key={f.id}>
                              <TableCell>{f.label}</TableCell>
                              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                {formatINR(f.amountPaise ?? 0)}
                              </TableCell>
                              <TableCell>
                                {linked ? (
                                  `On issue of ${linked.code}`
                                ) : (
                                  <span className="esti-label esti-label--secondary">Manual</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <StatusTag
                                    value={f.status as FeeStageStatus}
                                    map={CONS_FEE_STAGE_STATUS_TAG}
                                  />
                                  {f.status === "INVOICED" && f.invoiceDue && (
                                    <span
                                      className="esti-label esti-label--secondary"
                                      style={
                                        f.invoiceDue < new Date().toISOString().slice(0, 10)
                                          ? { color: "var(--cds-support-error, #da1e28)" }
                                          : undefined
                                      }
                                    >
                                      {f.invoiceDue < new Date().toISOString().slice(0, 10)
                                        ? `overdue ${Math.ceil((Date.now() - new Date(f.invoiceDue).getTime()) / 86400000)}d`
                                        : `due ${f.invoiceDue}`}
                                    </span>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                {f.studioInvoice ? (
                                  <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                                    <span className="esti-label esti-label--secondary">
                                      {f.studioInvoice.ref} · {f.studioInvoice.status}
                                    </span>
                                    <InvoicePdfCell
                                      invoiceId={f.studioInvoice.id}
                                      initialStatus={f.studioInvoice.pdfStatus}
                                    />
                                  </Stack>
                                ) : (
                                  <span className="esti-label esti-label--secondary">—</span>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <RowActionsMenu
                                  actions={[
                                    ...(f.status === "BILLABLE"
                                      ? [
                                          {
                                            label: detail.projectId
                                              ? "Raise Studio invoice (30-day terms)"
                                              : "Raise Studio invoice (link Studio project first)",
                                            disabled:
                                              !detail.projectId || markInvoiced.isPending,
                                            onClick: () => markInvoiced.mutate({ id: f.id }),
                                          },
                                        ]
                                      : []),
                                    ...(f.status === "INVOICED"
                                      ? [
                                          {
                                            label: "Mark paid",
                                            disabled: markPaid.isPending,
                                            onClick: () => markPaid.mutate({ id: f.id }),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: "Delete",
                                      danger: true,
                                      disabled: removeFeeStage.isPending,
                                      onClick: () => removeFeeStage.mutate({ id: f.id }),
                                    },
                                  ]}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Variations — out-of-scope work with approval → billing. */}
              {detail.variations.length > 0 && (
                <Box sx={{ pt: 1 }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Variations
                  </Typography>
                  <TableContainer>
                    <Table size="small" aria-label="Variations">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Source</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.variations.map((v) => {
                          const srcTq = detail.tqs.find((t) => t.id === v.sourceTqId);
                          return (
                            <TableRow key={v.id}>
                              <TableCell>{v.code}</TableCell>
                              <TableCell>{v.title}</TableCell>
                              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                {formatINR(v.amountPaise ?? 0)}
                              </TableCell>
                              <TableCell>
                                {srcTq ? (
                                  srcTq.code
                                ) : (
                                  <span className="esti-label esti-label--secondary">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <StatusTag
                                  value={v.status as VariationStatus}
                                  map={CONS_VARIATION_STATUS_TAG}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <RowActionsMenu
                                  actions={[
                                    ...(v.status === "PROPOSED"
                                      ? [
                                          {
                                            label: "Approve — add billable stage",
                                            disabled: approveVariation.isPending,
                                            onClick: () => approveVariation.mutate({ id: v.id }),
                                          },
                                          {
                                            label: "Reject",
                                            disabled: rejectVariation.isPending,
                                            onClick: () => rejectVariation.mutate({ id: v.id }),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: "Delete",
                                      danger: true,
                                      disabled: removeVariation.isPending,
                                      onClick: () => removeVariation.mutate({ id: v.id }),
                                    },
                                  ]}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Site visits — field observation reports (observe, never inspect). */}
              <Box sx={{ pt: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                    Site visits
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setFrDate(new Date().toISOString().slice(0, 10));
                      setFrWeather("");
                      setFrPersonnel("");
                      setFrWork("");
                      setFrObservations("");
                      setFrNcs("");
                      setFrInstructions("");
                      setFrNextVisit("");
                      setFrOpen(true);
                    }}
                  >
                    Record visit
                  </Button>
                </Stack>
                {detail.fieldReports.length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No site visits recorded — field reports document general conformance
                    observations, issued within 2–3 working days of the visit.
                  </span>
                ) : (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {detail.fieldReports.map((fr) => (
                      <Box key={fr.id} sx={{ p: 1.25, border: 1, borderColor: "divider" }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} className="esti-grow">
                              {`Report #${fr.reportNo} · ${fr.visitDate}`}
                              {fr.weather ? ` · ${fr.weather}` : ""}
                            </Typography>
                            <span className="esti-label esti-label--secondary">{fr.authorName}</span>
                            <RowActionsMenu
                              actions={[
                                {
                                  label: "Delete",
                                  danger: true,
                                  disabled: removeFieldReport.isPending,
                                  onClick: () => removeFieldReport.mutate({ id: fr.id }),
                                },
                              ]}
                            />
                          </Stack>
                          {fr.personnel && (
                            <span className="esti-label esti-label--secondary">On site: {fr.personnel}</span>
                          )}
                          {fr.workObserved && (
                            <span className="esti-label esti-label--secondary">Work: {fr.workObserved}</span>
                          )}
                          {fr.observations && (
                            <Typography variant="body2">{fr.observations}</Typography>
                          )}
                          {fr.nonconformances && (
                            <span className="esti-label esti-label--secondary" style={{ color: "var(--cds-support-error, #da1e28)" }}>
                              NC: {fr.nonconformances}
                            </span>
                          )}
                          {fr.instructions && (
                            <span className="esti-label esti-label--secondary">Instructions: {fr.instructions}</span>
                          )}
                          {fr.nextVisit && (
                            <span className="esti-label esti-label--secondary">Next visit: {fr.nextVisit}</span>
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Time booked — substrate for WIP / utilisation / realisation. */}
              <Box sx={{ pt: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }} className="esti-grow">
                    Time
                  </Typography>
                  {detail.feePosition && detail.feePosition.pendingApproval > 0 && (
                    <Button
                      size="small"
                      variant="text"
                      disabled={approveTime.isPending}
                      onClick={() =>
                        selectedId && approveTime.mutate({ engagementId: selectedId })
                      }
                    >
                      Approve all ({detail.feePosition.pendingApproval})
                    </Button>
                  )}
                </Stack>
                {detail.feePosition && (
                  <span className="esti-label esti-label--secondary">
                    {`${detail.feePosition.hoursBooked}h booked · value ${formatINR(detail.feePosition.timeValuePaise)} · WIP ${formatINR(detail.feePosition.wipPaise)}`}
                    {detail.feePosition.pendingApproval > 0
                      ? ` · ${detail.feePosition.pendingApproval} pending approval`
                      : ""}
                  </span>
                )}
                {detail.timesheets.length > 0 && (
                  <TableContainer sx={{ mt: 1 }}>
                    <Table size="small" aria-label="Timesheet entries">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Who</TableCell>
                          <TableCell>Grade</TableCell>
                          <TableCell align="right">Hours</TableCell>
                          <TableCell align="right">Value</TableCell>
                          <TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.timesheets.slice(0, 8).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{t.date}</TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <span>{t.userName}</span>
                                <span className="esti-label esti-label--secondary">
                                  {t.status === "APPROVED"
                                    ? `approved · ${t.approvedByName ?? ""}`
                                    : "pending approval"}
                                </span>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {CONS_GRADE_LABEL[t.grade as ConsGrade] ?? t.grade}
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {t.hours}
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {formatINR(t.valuePaise ?? 0)}
                            </TableCell>
                            <TableCell align="right">
                              <RowActionsMenu
                                actions={[
                                  {
                                    label: "Delete",
                                    danger: true,
                                    disabled: removeTime.isPending,
                                    onClick: () => removeTime.mutate({ id: t.id }),
                                  },
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Technical query register — closure evidence required to close. */}
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                  Technical queries
                </Typography>
                {detail.tqs.length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No technical queries — raise one from the dock when a question needs a
                    dated, closable record.
                  </span>
                ) : (
                  <TableContainer>
                    <Table size="small" aria-label="Technical query register">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Question</TableCell>
                          <TableCell>Scope</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.tqs.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <span>{t.code}</span>
                                {t.dueDate && t.status !== "CLOSED" && (
                                  <span
                                    className="esti-label esti-label--secondary"
                                    style={
                                      t.dueDate < new Date().toISOString().slice(0, 10)
                                        ? { color: "var(--cds-support-error, #da1e28)" }
                                        : undefined
                                    }
                                  >
                                    {t.dueDate < new Date().toISOString().slice(0, 10)
                                      ? `overdue · ${t.dueDate}`
                                      : `due ${t.dueDate}`}
                                  </span>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <span>{t.question}</span>
                                {t.answer && (
                                  <span className="esti-label esti-label--secondary">
                                    Answer: {t.answer}
                                  </span>
                                )}
                                {t.closureNote && (
                                  <span className="esti-label esti-label--secondary">
                                    Closure: {t.closureNote}
                                  </span>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {t.scopeImpact ? (
                                <StatusDot color="red" label="Scope impact" />
                              ) : (
                                <span className="esti-label esti-label--secondary">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusTag value={t.status as TqStatus} map={CONS_TQ_STATUS_TAG} />
                            </TableCell>
                            <TableCell align="right">
                              <RowActionsMenu
                                actions={[
                                  ...(t.scopeImpact
                                    ? [
                                        {
                                          label: "Raise variation",
                                          onClick: () => {
                                            setVoCode("");
                                            setVoTitle(t.question.slice(0, 120));
                                            setVoAmount("");
                                            setVoSourceTqId(t.id);
                                            setVoOpen(true);
                                          },
                                        },
                                      ]
                                    : []),
                                  ...(t.status !== "CLOSED"
                                    ? [
                                        {
                                          label: t.status === "OPEN" ? "Answer" : "Revise answer",
                                          onClick: () => {
                                            setTqAnswerText(t.answer ?? "");
                                            setTqAnswerFor(t.id);
                                          },
                                        },
                                      ]
                                    : []),
                                  ...(t.status === "ANSWERED"
                                    ? [
                                        {
                                          label: "Close with evidence",
                                          onClick: () => {
                                            setTqCloseNote("");
                                            setTqCloseFor(t.id);
                                          },
                                        },
                                      ]
                                    : []),
                                  {
                                    label: "Delete",
                                    danger: true,
                                    disabled: removeTq.isPending,
                                    onClick: () => removeTq.mutate({ id: t.id }),
                                  },
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
              {/* Risk register — inherent vs residual. */}
              <Box sx={{ pt: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                    Risks
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setRiskTitle("");
                      setRiskL("3");
                      setRiskI("3");
                      setRiskRL("");
                      setRiskRI("");
                      setRiskOwner("");
                      setRiskMitigation("");
                      setRiskOpen(true);
                    }}
                  >
                    Add risk
                  </Button>
                </Stack>
                {detail.risks.length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No risks registered for this engagement.
                  </span>
                ) : (
                  <TableContainer>
                    <Table size="small" aria-label="Risk register">
                      <TableHead>
                        <TableRow>
                          <TableCell>Risk</TableCell>
                          <TableCell align="center">Inherent</TableCell>
                          <TableCell align="center">Residual</TableCell>
                          <TableCell>Owner</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.risks.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <span>{r.title}</span>
                                {r.mitigation && (
                                  <span className="esti-label esti-label--secondary">
                                    Mitigation: {r.mitigation}
                                  </span>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {`${r.likelihood}×${r.impact} = ${(r.likelihood ?? 0) * (r.impact ?? 0)}`}
                            </TableCell>
                            <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {r.residualLikelihood != null && r.residualImpact != null
                                ? `${r.residualLikelihood}×${r.residualImpact} = ${r.residualLikelihood * r.residualImpact}`
                                : "—"}
                            </TableCell>
                            <TableCell>{r.owner ?? "—"}</TableCell>
                            <TableCell>
                              <StatusTag value={r.status as RiskStatus} map={CONS_RISK_STATUS_TAG} />
                            </TableCell>
                            <TableCell align="right">
                              <RowActionsMenu
                                actions={[
                                  ...(r.status === "OPEN"
                                    ? [
                                        {
                                          label: "Mark mitigated",
                                          onClick: () =>
                                            updateRisk.mutate({ id: r.id, status: "MITIGATED" }),
                                        },
                                      ]
                                    : []),
                                  ...(r.status !== "CLOSED"
                                    ? [
                                        {
                                          label: "Close",
                                          onClick: () =>
                                            updateRisk.mutate({ id: r.id, status: "CLOSED" }),
                                        },
                                      ]
                                    : []),
                                  {
                                    label: "Delete",
                                    danger: true,
                                    disabled: removeRisk.isPending,
                                    onClick: () => removeRisk.mutate({ id: r.id }),
                                  },
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Reliance letters — controlled third-party reliance. */}
              <Box sx={{ pt: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }} className="esti-grow">
                    Reliance letters
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setRelBeneficiary("");
                      setRelPurpose("");
                      setRelIssuedOn(new Date().toISOString().slice(0, 10));
                      setRelExpiresOn("");
                      setRelOpen(true);
                    }}
                  >
                    Record letter
                  </Button>
                </Stack>
                {detail.relianceLetters.length === 0 ? (
                  <span className="esti-label esti-label--secondary">
                    No third-party reliance granted — each letter is a new potential claimant.
                  </span>
                ) : (
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {detail.relianceLetters.map((rl) => (
                      <Stack key={rl.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Stack spacing={0} className="esti-grow">
                          <Typography variant="body2">{rl.beneficiary}</Typography>
                          <span className="esti-label esti-label--secondary">
                            {rl.purpose} · issued {rl.issuedOn}
                            {rl.expiresOn ? ` · expires ${rl.expiresOn}` : ""}
                          </span>
                        </Stack>
                        <RowActionsMenu
                          actions={[
                            {
                              label: "Delete",
                              danger: true,
                              disabled: removeReliance.isPending,
                              onClick: () => removeReliance.mutate({ id: rl.id }),
                            },
                          ]}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>

              <EngagementPreconPanels
                engagementId={detail.id}
                opportunities={detail.opportunities ?? []}
                phaseGates={detail.phaseGates ?? []}
                onInvalidate={invalidate}
              />

              <EngagementCloseoutPanels
                detail={detail}
                canFees={detail.feePosition != null}
                onInvalidate={invalidate}
              />
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* Ask intelligence — the internal agent, grounded in the firm record. */}
      <Dialog open={askOpen} onClose={() => setAskOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Ask intelligence</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-ask"
              label="Question"
              placeholder="e.g. What is still billable, and which deliverables are held?"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              multiline
              rows={2}
              autoFocus
              helperText="Answers only from the firm record — validated input packs are working assumptions; unvalidated packs appear as holds. Capacity alerts included when load is tight."
            />
            {ask.isPending && (
              <span className="esti-label esti-label--secondary">
                Reading the firm record…
              </span>
            )}
            {askAnswer && (
              <Box sx={{ p: 1.5, border: 1, borderColor: "divider", whiteSpace: "pre-wrap" }}>
                <Typography variant="body2" component="p">
                  {askAnswer}
                </Typography>
              </Box>
            )}
            {askAnswer && (
              <span className="esti-label esti-label--secondary">
                AI-generated from the record — verify against the register before relying on it.
              </span>
            )}
            <TextField
              id="cons-precedent"
              label="Find precedents"
              placeholder="e.g. structural peer review Zone III"
              value={precedentQ}
              onChange={(e) => setPrecedentQ(e.target.value)}
              helperText="Deterministic match on type, model, title, brief, deliverables — no LLM"
            />
            {precedentsQ.isFetching && (
              <span className="esti-label esti-label--secondary">Searching engagements…</span>
            )}
            {(precedentsQ.data ?? []).length > 0 && (
              <Stack spacing={1}>
                {precedentsQ.data!.map((h) => (
                  <Box key={h.id} sx={{ p: 1.5, border: 1, borderColor: "divider" }}>
                    <Typography variant="subtitle2" component="p">
                      {h.title}
                    </Typography>
                    <span className="esti-label esti-label--secondary">
                      {[h.consultancyType, h.model, h.stage, h.status]
                        .filter(Boolean)
                        .join(" · ")}
                      {` · score ${h.score}`}
                      {h.reasons.length ? ` · ${h.reasons.join(", ")}` : ""}
                    </span>
                  </Box>
                ))}
              </Stack>
            )}
            {precedentQ.trim().length >= 2 &&
              !precedentsQ.isFetching &&
              (precedentsQ.data?.length ?? 0) === 0 && (
                <span className="esti-label esti-label--secondary">
                  No precedent engagements matched that query.
                </span>
              )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskOpen(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={askQuestion.trim().length < 3 || ask.isPending}
            onClick={() => ask.mutate({ question: askQuestion.trim() })}
          >
            Ask
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deterministic deliverable lineage (sign-off + fee stages). */}
      <Dialog open={!!lineageFor} onClose={() => setLineageFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sign-off lineage</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {lineageQ.isLoading && (
              <span className="esti-label esti-label--secondary">Loading lineage…</span>
            )}
            {lineageQ.data && (
              <Box sx={{ p: 1.5, border: 1, borderColor: "divider", whiteSpace: "pre-wrap" }}>
                <Typography variant="body2" component="p">
                  {lineageQ.data.summary}
                </Typography>
              </Box>
            )}
            <span className="esti-label esti-label--secondary">
              Deterministic register walk — not an AI answer. Verify against the chain before
              relying on it.
            </span>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLineageFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* EOMS review recommendation */}
      <Dialog open={!!eomsFor} onClose={() => setEomsFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>EOMS review — {eomsFor}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {eomsReview.isPending && (
              <span className="esti-label esti-label--secondary">
                EOMS is drafting the validation checklist…
              </span>
            )}
            {eomsText && (
              <Box sx={{ p: 1.5, border: 1, borderColor: "divider", whiteSpace: "pre-wrap" }}>
                <Typography variant="body2" component="p">
                  {eomsText}
                </Typography>
              </Box>
            )}
            <span className="esti-label esti-label--secondary">
              A recommendation for the named validator — running the checklist and
              validating the pack remains a human act.
            </span>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEomsFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Record site visit — G711 anatomy. */}
      <Dialog open={frOpen} onClose={() => setFrOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record site visit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                id="fr-date"
                label="Visit date"
                type="date"
                value={frDate}
                onChange={(e) => setFrDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                id="fr-weather"
                label="Weather"
                placeholder="e.g. Clear, 31°C"
                value={frWeather}
                onChange={(e) => setFrWeather(e.target.value)}
                className="esti-grow"
              />
            </Stack>
            <TextField
              id="fr-personnel"
              label="Personnel / trades on site"
              value={frPersonnel}
              onChange={(e) => setFrPersonnel(e.target.value)}
            />
            <TextField
              id="fr-work"
              label="Work in progress"
              value={frWork}
              onChange={(e) => setFrWork(e.target.value)}
            />
            <TextField
              id="fr-observations"
              label="Observations"
              value={frObservations}
              onChange={(e) => setFrObservations(e.target.value)}
              multiline
              rows={3}
              helperText="Facts with location + responsible party — observe, never inspect/supervise"
            />
            <TextField
              id="fr-ncs"
              label="Nonconformances (optional)"
              value={frNcs}
              onChange={(e) => setFrNcs(e.target.value)}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="fr-instructions"
                label="Instructions given (optional)"
                value={frInstructions}
                onChange={(e) => setFrInstructions(e.target.value)}
                className="esti-grow"
              />
              <TextField
                id="fr-next"
                label="Next visit"
                type="date"
                value={frNextVisit}
                onChange={(e) => setFrNextVisit(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFrOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!frDate || !selectedId || createFieldReport.isPending}
            onClick={() =>
              selectedId &&
              createFieldReport.mutate({
                engagementId: selectedId,
                visitDate: frDate,
                weather: frWeather.trim() || undefined,
                personnel: frPersonnel.trim() || undefined,
                workObserved: frWork.trim() || undefined,
                observations: frObservations.trim() || undefined,
                nonconformances: frNcs.trim() || undefined,
                instructions: frInstructions.trim() || undefined,
                nextVisit: frNextVisit || undefined,
              })
            }
          >
            Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* CRS — comment resolution sheet per deliverable (no issue while lines are open). */}
      <Dialog open={!!crsFor} onClose={() => setCrsFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Review comments — {detail?.deliverables.find((d) => d.id === crsFor)?.code ?? ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(detail?.deliverables.find((d) => d.id === crsFor)?.crs ?? []).map((c) => (
              <Box key={c.id} sx={{ p: 1.25, border: 1, borderColor: "divider" }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <span className="esti-label esti-grow">
                      {c.reviewer} · rev {c.revision}
                    </span>
                    <StatusTag value={c.status as CrsStatus} map={CONS_CRS_STATUS_TAG} />
                  </Stack>
                  <Typography variant="body2">{c.comment}</Typography>
                  {c.response && (
                    <span className="esti-label esti-label--secondary">
                      Response: {c.response}
                    </span>
                  )}
                  {c.status === "OPEN" &&
                    (crsRespondFor === c.id ? (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                        <TextField
                          id={`crs-response-${c.id}`}
                          size="small"
                          label="Response (required to close)"
                          value={crsResponse}
                          onChange={(e) => setCrsResponse(e.target.value)}
                          className="esti-grow"
                          autoFocus
                        />
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!crsResponse.trim() || closeCrs.isPending}
                          onClick={() =>
                            closeCrs.mutate({ id: c.id, response: crsResponse.trim() })
                          }
                        >
                          Close line
                        </Button>
                      </Stack>
                    ) : (
                      <Box>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setCrsRespondFor(c.id);
                            setCrsResponse("");
                          }}
                        >
                          Respond &amp; close
                        </Button>
                      </Box>
                    ))}
                </Stack>
              </Box>
            ))}
            {(detail?.deliverables.find((d) => d.id === crsFor)?.crs ?? []).length === 0 && (
              <span className="esti-label esti-label--secondary">
                No review comments on this deliverable yet.
              </span>
            )}
            <Stack spacing={1} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
              <span className="esti-label">Add comment</span>
              <TextField
                id="crs-reviewer"
                size="small"
                label="Reviewer"
                placeholder="e.g. Architect / Studio Arcline"
                value={crsReviewer}
                onChange={(e) => setCrsReviewer(e.target.value)}
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <TextField
                  id="crs-comment"
                  size="small"
                  label="Comment"
                  value={crsComment}
                  onChange={(e) => setCrsComment(e.target.value)}
                  className="esti-grow"
                  multiline
                  rows={2}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!crsReviewer.trim() || !crsComment.trim() || !crsFor || addCrs.isPending}
                  onClick={() =>
                    crsFor &&
                    addCrs.mutate({
                      deliverableId: crsFor,
                      reviewer: crsReviewer.trim(),
                      comment: crsComment.trim(),
                    })
                  }
                >
                  Add
                </Button>
              </Stack>
              <span className="esti-label esti-label--secondary">
                Open lines block issue — the closed sheet with responses is the review record.
              </span>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrsFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Project brief — typed form generated from the consultancy type's template. */}
      <Dialog open={briefOpen} onClose={() => setBriefOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Project brief — {detail?.consultancyType
            ? CONSULTANCY_TYPE_LABEL[detail.consultancyType as ConsultancyType]
            : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(detail?.consultancyType
              ? CONSULTANCY_BRIEF_TEMPLATES[detail.consultancyType as ConsultancyType] ?? []
              : []
            ).map((f) =>
              f.kind === "boolean" ? (
                <FormControlLabel
                  key={f.key}
                  control={
                    <Checkbox
                      checked={briefDraft[f.key] === "true"}
                      onChange={(e) =>
                        setBriefDraft((d) => ({ ...d, [f.key]: e.target.checked ? "true" : "false" }))
                      }
                    />
                  }
                  label={`${f.label}${f.hint ? ` — ${f.hint}` : ""}`}
                />
              ) : f.kind === "choice" ? (
                <TextField
                  key={f.key}
                  id={`cons-brief-${f.key}`}
                  select
                  size="small"
                  label={f.label}
                  value={briefDraft[f.key] ?? ""}
                  onChange={(e) => setBriefDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  helperText={f.hint}
                >
                  <MenuItem value="">—</MenuItem>
                  {(f.options ?? []).map((o) => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  key={f.key}
                  id={`cons-brief-${f.key}`}
                  size="small"
                  label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}
                  value={briefDraft[f.key] ?? ""}
                  onChange={(e) => setBriefDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  helperText={f.hint}
                  slotProps={f.kind === "number" ? { htmlInput: { inputMode: "decimal" } } : undefined}
                />
              ),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBriefOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedId || setBrief.isPending}
            onClick={() => {
              if (!selectedId || !detail?.consultancyType) return;
              const template =
                CONSULTANCY_BRIEF_TEMPLATES[detail.consultancyType as ConsultancyType] ?? [];
              const brief: Record<string, string | number | boolean> = {};
              for (const f of template) {
                const raw = (briefDraft[f.key] ?? "").trim();
                if (raw === "" || (f.kind === "boolean" && raw === "false")) continue;
                brief[f.key] =
                  f.kind === "number"
                    ? Number.parseFloat(raw)
                    : f.kind === "boolean"
                      ? raw === "true"
                      : raw;
                if (f.kind === "number" && Number.isNaN(brief[f.key])) delete brief[f.key];
              }
              setBrief.mutate({ engagementId: selectedId, brief });
            }}
          >
            Save brief
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add custom phase */}
      <Dialog open={phaseOpen} onClose={() => setPhaseOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add phase</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-phase-name"
              label="Phase"
              placeholder="e.g. Retrofit assessment"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-phase-scope"
              label="Scope items (one per line)"
              value={phaseScope}
              onChange={(e) => setPhaseScope(e.target.value)}
              multiline
              rows={4}
              helperText="These bound the consultancy's time — work beyond them is a variation"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhaseOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!phaseName.trim() || !selectedId || addPhase.isPending}
            onClick={() =>
              selectedId &&
              addPhase.mutate({
                engagementId: selectedId,
                name: phaseName.trim(),
                scope: phaseScope
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 20),
              })
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record input pack */}
      <Dialog open={packOpen} onClose={() => setPackOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record input pack</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-pack-title"
              label="Title"
              placeholder="e.g. Geotech report rev B"
              value={packTitle}
              onChange={(e) => setPackTitle(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-pack-kind"
              select
              label="Kind"
              value={packKind}
              onChange={(e) => setPackKind(e.target.value as InputPackKind)}
            >
              {InputPackKind.options.map((k) => (
                <MenuItem key={k} value={k}>
                  {INPUT_PACK_KIND_LABEL[k]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-pack-source"
              label="Source (optional)"
              placeholder="e.g. SoilTech Labs, 2026-07-10"
              value={packSource}
              onChange={(e) => setPackSource(e.target.value)}
              helperText="Recorded packs hold issue until validated or rejected"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPackOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!packTitle.trim() || !selectedId || recordPack.isPending}
            onClick={() =>
              selectedId &&
              recordPack.mutate({
                engagementId: selectedId,
                title: packTitle.trim(),
                kind: packKind,
                source: packSource.trim() || undefined,
              })
            }
          >
            Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record calc package (P9.4 / D4 lineage) */}
      <Dialog open={calcOpen} onClose={() => setCalcOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record calc package</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-calc-code"
              label="Code"
              placeholder="e.g. CALC-01"
              value={calcCode}
              onChange={(e) => setCalcCode(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-calc-title"
              label="Title"
              placeholder="e.g. Core wall design — Zone III"
              value={calcTitle}
              onChange={(e) => setCalcTitle(e.target.value)}
            />
            <TextField
              id="cons-calc-revision"
              label="Revision"
              value={calcRevision}
              onChange={(e) => setCalcRevision(e.target.value)}
            />
            <TextField
              id="cons-calc-tool"
              label="Software / tool (optional)"
              placeholder="e.g. ETABS 21 · spreadsheet"
              value={calcTool}
              onChange={(e) => setCalcTool(e.target.value)}
            />
            <TextField
              id="cons-calc-deliverable"
              select
              label="Linked deliverable (optional)"
              value={calcDeliverableId}
              onChange={(e) => setCalcDeliverableId(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {(detail?.deliverables ?? []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.code} — {d.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-calc-code-refs"
              label="Code references (optional)"
              placeholder="e.g. IS 456:2000 §38 · NBC 2016 Part 6"
              value={calcCodeRefs}
              onChange={(e) => setCalcCodeRefs(e.target.value)}
              multiline
              minRows={2}
            />
            <TextField
              id="cons-calc-assumptions"
              label="Assumptions (optional)"
              placeholder="SBC, seismic zone, load combinations…"
              value={calcAssumptions}
              onChange={(e) => setCalcAssumptions(e.target.value)}
              multiline
              minRows={2}
              helperText="Lineage only — the firm's tools compute; AORMS records what was relied on"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalcOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !calcCode.trim() || !calcTitle.trim() || !selectedId || recordCalc.isPending
            }
            onClick={() =>
              selectedId &&
              recordCalc.mutate({
                engagementId: selectedId,
                code: calcCode.trim(),
                title: calcTitle.trim(),
                revision: calcRevision.trim() || "P01",
                softwareTool: calcTool.trim() || undefined,
                codeRefs: calcCodeRefs.trim() || undefined,
                assumptions: calcAssumptions.trim() || undefined,
                deliverableId: calcDeliverableId || undefined,
              })
            }
          >
            Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add risk */}
      <Dialog open={riskOpen} onClose={() => setRiskOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add risk</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-risk-title"
              label="Risk (event + cause + effect)"
              value={riskTitle}
              onChange={(e) => setRiskTitle(e.target.value)}
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="cons-risk-l"
                label="Likelihood (1–5)"
                value={riskL}
                onChange={(e) => setRiskL(e.target.value)}
                size="small"
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
              />
              <TextField
                id="cons-risk-i"
                label="Impact (1–5)"
                value={riskI}
                onChange={(e) => setRiskI(e.target.value)}
                size="small"
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
              />
            </Stack>
            <TextField
              id="cons-risk-mitigation"
              label="Mitigation (optional)"
              value={riskMitigation}
              onChange={(e) => setRiskMitigation(e.target.value)}
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="cons-risk-rl"
                label="Residual L (optional)"
                value={riskRL}
                onChange={(e) => setRiskRL(e.target.value)}
                size="small"
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
              />
              <TextField
                id="cons-risk-ri"
                label="Residual I (optional)"
                value={riskRI}
                onChange={(e) => setRiskRI(e.target.value)}
                size="small"
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
              />
              <TextField
                id="cons-risk-owner"
                label="Owner (optional)"
                value={riskOwner}
                onChange={(e) => setRiskOwner(e.target.value)}
                size="small"
                className="esti-grow"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRiskOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !riskTitle.trim() ||
              !(Number.parseInt(riskL) >= 1 && Number.parseInt(riskL) <= 5) ||
              !(Number.parseInt(riskI) >= 1 && Number.parseInt(riskI) <= 5) ||
              !selectedId ||
              createRisk.isPending
            }
            onClick={() =>
              selectedId &&
              createRisk.mutate({
                engagementId: selectedId,
                title: riskTitle.trim(),
                likelihood: Number.parseInt(riskL),
                impact: Number.parseInt(riskI),
                response: "REDUCE",
                mitigation: riskMitigation.trim() || undefined,
                owner: riskOwner.trim() || undefined,
                residualLikelihood: riskRL.trim() ? Number.parseInt(riskRL) : undefined,
                residualImpact: riskRI.trim() ? Number.parseInt(riskRI) : undefined,
              })
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record reliance letter */}
      <Dialog open={relOpen} onClose={() => setRelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record reliance letter</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-rel-beneficiary"
              label="Beneficiary"
              placeholder="e.g. HDFC Bank (project lender)"
              value={relBeneficiary}
              onChange={(e) => setRelBeneficiary(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-rel-purpose"
              label="Purpose limit"
              placeholder="What they may rely on, and for what"
              value={relPurpose}
              onChange={(e) => setRelPurpose(e.target.value)}
              multiline
              rows={2}
              helperText="Each reliance letter is a new potential claimant — name and bound it"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="cons-rel-issued"
                label="Issued on"
                type="date"
                value={relIssuedOn}
                onChange={(e) => setRelIssuedOn(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                id="cons-rel-expires"
                label="Expires (optional)"
                type="date"
                value={relExpiresOn}
                onChange={(e) => setRelExpiresOn(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !relBeneficiary.trim() || !relPurpose.trim() || !relIssuedOn || !relExpiresOn ||
              !selectedId || createReliance.isPending
            }
            onClick={() =>
              selectedId &&
              createReliance.mutate({
                engagementId: selectedId,
                beneficiary: relBeneficiary.trim(),
                purpose: relPurpose.trim(),
                issuedOn: relIssuedOn,
                expiresOn: relExpiresOn,
              })
            }
          >
            Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raise variation */}
      <Dialog open={voOpen} onClose={() => setVoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise variation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-vo-code"
              label="Register code"
              placeholder="e.g. VO-001"
              value={voCode}
              onChange={(e) => setVoCode(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-vo-title"
              label="Title"
              value={voTitle}
              onChange={(e) => setVoTitle(e.target.value)}
            />
            <TextField
              id="cons-vo-amount"
              label="Proposed fee (₹)"
              placeholder="e.g. 40000"
              value={voAmount}
              onChange={(e) => setVoAmount(e.target.value)}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
              helperText={
                voSourceTqId
                  ? "Raised from a scope-impact TQ — approval adds a billable fee stage"
                  : "Approval adds a billable fee stage"
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !voCode.trim() ||
              !voTitle.trim() ||
              !(Number.parseFloat(voAmount) >= 0) ||
              !selectedId ||
              createVariation.isPending
            }
            onClick={() =>
              selectedId &&
              createVariation.mutate({
                engagementId: selectedId,
                code: voCode.trim(),
                title: voTitle.trim(),
                amountPaise: Math.round(Number.parseFloat(voAmount) * 100),
                sourceTqId: voSourceTqId,
              })
            }
          >
            Raise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log time */}
      <Dialog open={timeOpen} onClose={() => setTimeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log time</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                id="cons-time-date"
                label="Date"
                type="date"
                value={timeDate}
                onChange={(e) => setTimeDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                id="cons-time-hours"
                label="Hours"
                placeholder="e.g. 6"
                value={timeHours}
                onChange={(e) => setTimeHours(e.target.value)}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
                autoFocus
              />
            </Stack>
            <TextField
              id="cons-time-grade"
              select
              label="Grade"
              value={timeGrade}
              onChange={(e) => setTimeGrade(e.target.value as ConsGrade)}
              helperText="Value is snapshotted at this grade's current chargeout rate"
            >
              {ConsGrade.options.map((g) => (
                <MenuItem key={g} value={g}>
                  {CONS_GRADE_LABEL[g]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-time-deliverable"
              select
              label="Deliverable (optional)"
              value={timeDeliverableId}
              onChange={(e) => setTimeDeliverableId(e.target.value)}
            >
              <MenuItem value="">Engagement-level</MenuItem>
              {(detail?.deliverables ?? []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.code} — {d.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-time-note"
              label="Note (optional)"
              value={timeNote}
              onChange={(e) => setTimeNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !timeDate ||
              !(Number.parseFloat(timeHours) > 0) ||
              !selectedId ||
              logTime.isPending
            }
            onClick={() =>
              selectedId &&
              logTime.mutate({
                engagementId: selectedId,
                date: timeDate,
                hours: Number.parseFloat(timeHours),
                grade: timeGrade,
                deliverableId: timeDeliverableId || undefined,
                note: timeNote.trim() || undefined,
              })
            }
          >
            Log
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rate card */}
      <Dialog open={ratesOpen} onClose={() => setRatesOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Rate card</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <span className="esti-label esti-label--secondary">
              Chargeout rate (₹/hour) and firm capacity (hours/week) per grade —
              capacity is the utilisation denominator.
            </span>
            {ConsGrade.options.map((g) => (
              <Stack key={g} direction="row" spacing={1.5}>
                <TextField
                  id={`cons-rate-${g}`}
                  label={`${CONS_GRADE_LABEL[g]} — ₹/hr`}
                  value={rateDraft[g] ?? ""}
                  onChange={(e) => setRateDraft((d) => ({ ...d, [g]: e.target.value }))}
                  size="small"
                  className="esti-grow"
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <TextField
                  id={`cons-cap-${g}`}
                  label="hrs/wk"
                  value={capDraft[g] ?? ""}
                  onChange={(e) => setCapDraft((d) => ({ ...d, [g]: e.target.value }))}
                  size="small"
                  className="esti-input-sm"
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatesOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={setRates.isPending}
            onClick={() =>
              setRates.mutate({
                rates: ConsGrade.options
                  .filter((g) => (rateDraft[g] ?? "").trim() !== "")
                  .map((g) => ({
                    grade: g,
                    ratePaise: Math.round(Number.parseFloat(rateDraft[g]!) * 100) || 0,
                    capacityHoursWeek:
                      (capDraft[g] ?? "").trim() !== ""
                        ? Number.parseFloat(capDraft[g]!) || 0
                        : undefined,
                  })),
              })
            }
          >
            Save rates
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add fee stage */}
      <Dialog open={feeOpen} onClose={() => setFeeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add fee stage</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-fee-label"
              label="Stage"
              placeholder="e.g. Stage 4 — detailed design"
              value={feeLabel}
              onChange={(e) => setFeeLabel(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-fee-amount"
              label="Amount (₹)"
              placeholder="e.g. 250000"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
            <TextField
              id="cons-fee-deliverable"
              select
              label="Billing trigger (optional)"
              value={feeDeliverableId}
              onChange={(e) => setFeeDeliverableId(e.target.value)}
              helperText="Linked stages turn billable automatically when the deliverable is issued"
            >
              <MenuItem value="">Manual — no linked deliverable</MenuItem>
              {(detail?.deliverables ?? [])
                .filter((d) => d.status === "DRAFT")
                .map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.code} — {d.title}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !feeLabel.trim() ||
              !(Number.parseFloat(feeAmount) >= 0) ||
              !selectedId ||
              createFeeStage.isPending
            }
            onClick={() =>
              selectedId &&
              createFeeStage.mutate({
                engagementId: selectedId,
                label: feeLabel.trim(),
                amountPaise: Math.round(Number.parseFloat(feeAmount) * 100),
                deliverableId: feeDeliverableId || undefined,
              })
            }
          >
            Add stage
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raise TQ */}
      <Dialog open={tqOpen} onClose={() => setTqOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise technical query</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-tq-code"
              label="Register code"
              placeholder="e.g. TQ-001"
              value={tqCode}
              onChange={(e) => setTqCode(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-tq-question"
              label="Question"
              value={tqQuestion}
              onChange={(e) => setTqQuestion(e.target.value)}
              multiline
              rows={3}
            />
            <TextField
              id="cons-tq-due"
              label="Answer due"
              type="date"
              value={tqDueDate}
              onChange={(e) => setTqDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Contractual SLA — typically 5–14 working days; the register tracks it"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={tqScopeImpact}
                  onChange={(e) => setTqScopeImpact(e.target.checked)}
                />
              }
              label="Expands scope — flag for a variation"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTqOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!tqCode.trim() || !tqQuestion.trim() || !selectedId || raiseTq.isPending}
            onClick={() =>
              selectedId &&
              raiseTq.mutate({
                engagementId: selectedId,
                code: tqCode.trim(),
                question: tqQuestion.trim(),
                dueDate: tqDueDate || undefined,
                scopeImpact: tqScopeImpact,
              })
            }
          >
            Raise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Answer TQ */}
      <Dialog open={!!tqAnswerFor} onClose={() => setTqAnswerFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Record answer</DialogTitle>
        <DialogContent>
          <TextField
            id="cons-tq-answer"
            label="Answer"
            value={tqAnswerText}
            onChange={(e) => setTqAnswerText(e.target.value)}
            multiline
            rows={4}
            fullWidth
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTqAnswerFor(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!tqAnswerText.trim() || answerTq.isPending}
            onClick={() =>
              tqAnswerFor && answerTq.mutate({ id: tqAnswerFor, answer: tqAnswerText.trim() })
            }
          >
            Save answer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close TQ with evidence */}
      <Dialog open={!!tqCloseFor} onClose={() => setTqCloseFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Close with evidence</DialogTitle>
        <DialogContent>
          <TextField
            id="cons-tq-closure"
            label="Closure evidence"
            placeholder="e.g. accepted on site walk 12 Jul; drawing STR-105 rev B reissued"
            value={tqCloseNote}
            onChange={(e) => setTqCloseNote(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 1 }}
            autoFocus
            helperText="Required — the dated closure trail is the dispute record"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTqCloseFor(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!tqCloseNote.trim() || closeTq.isPending}
            onClick={() =>
              tqCloseFor && closeTq.mutate({ id: tqCloseFor, closureNote: tqCloseNote.trim() })
            }
          >
            Close TQ
          </Button>
        </DialogActions>
      </Dialog>

      {/* New engagement */}
      <Dialog open={engOpen} onClose={() => setEngOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New engagement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-eng-title"
              label="Title"
              value={engTitle}
              onChange={(e) => setEngTitle(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-eng-model"
              select
              label="Engagement model"
              value={engModel}
              onChange={(e) => setEngModel(e.target.value as EngagementModel)}
            >
              {MODELS.map((m) => (
                <MenuItem key={m} value={m}>
                  {ENGAGEMENT_MODEL_LABEL[m]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-eng-type"
              select
              label="Consultancy type"
              value={engConsType}
              onChange={(e) => setEngConsType(e.target.value as ConsultancyType | "")}
              helperText="Seeds the engagement's phases and scope of work — each type has its own pattern"
            >
              {ConsultancyType.options.map((t) => (
                <MenuItem key={t} value={t}>
                  {CONSULTANCY_TYPE_LABEL[t]}
                </MenuItem>
              ))}
              <MenuItem value="">Untyped — no seeded scope</MenuItem>
            </TextField>
            <TextField
              id="cons-eng-discipline"
              select
              label="Lead discipline"
              value={engDiscipline}
              onChange={(e) => setEngDiscipline(e.target.value as EngineeringDiscipline)}
            >
              {DISCIPLINES.map((d) => (
                <MenuItem key={d} value={d}>
                  {ENGINEERING_DISCIPLINE_LABEL[d]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-eng-stage"
              label="Work stage (optional)"
              placeholder="e.g. Detailed design"
              value={engStage}
              onChange={(e) => setEngStage(e.target.value)}
            />
            <TextField
              id="cons-eng-reliance"
              label="Reliance scope (optional)"
              placeholder="What downstream parties may rely on"
              value={engReliance}
              onChange={(e) => setEngReliance(e.target.value)}
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEngOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!engTitle.trim() || createEngagement.isPending}
            onClick={() =>
              createEngagement.mutate({
                title: engTitle.trim(),
                model: engModel,
                consultancyType: engConsType || undefined,
                leadDiscipline: engDiscipline,
                stage: engStage.trim() || undefined,
                relianceScope: engReliance.trim() || undefined,
              })
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* New deliverable — MDR number allocated from job root + document type. */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add deliverable</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-del-doc-type"
              select
              label="Document type"
              value={delDocType}
              onChange={(e) => setDelDocType(e.target.value as MdrDocType)}
              helperText={
                detail?.code
                  ? (() => {
                      try {
                        const preview = buildMdrDeliverableCode({
                          jobRoot: detail.code,
                          docType: delDocType,
                          sequence: nextMdrSequence(
                            (detail.deliverables ?? []).map((d) => d.code),
                            detail.code,
                            delDocType,
                          ),
                        });
                        return `Register number will be ${preview} (revision stays metadata)`;
                      } catch {
                        return "Job number required to allocate an MDR register code";
                      }
                    })()
                  : "Select an engagement with a job number first"
              }
              autoFocus
            >
              {MDR_DOC_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {MDR_DOC_TYPE_LABEL[t]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-del-title"
              label="Title"
              value={delTitle}
              onChange={(e) => setDelTitle(e.target.value)}
            />
            <TextField
              id="cons-del-discipline"
              select
              label="Discipline"
              value={delDiscipline}
              onChange={(e) => setDelDiscipline(e.target.value as EngineeringDiscipline)}
            >
              {DISCIPLINES.map((d) => (
                <MenuItem key={d} value={d}>
                  {ENGINEERING_DISCIPLINE_LABEL[d]}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                id="cons-del-revision"
                label="Revision"
                value={delRevision}
                onChange={(e) => setDelRevision(e.target.value)}
                className="esti-input-sm"
                helperText="P01… preliminary · C01… contractual"
              />
              <TextField
                id="cons-del-issue-class"
                select
                label="Issue class"
                value={delIssueClass}
                onChange={(e) => setDelIssueClass(e.target.value as IssueClass)}
                className="esti-grow"
              >
                {ISSUE_CLASSES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {ISSUE_CLASS_LABEL[c]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              id="cons-del-check"
              select
              label="Check category"
              value={delCheckCategory}
              onChange={(e) => setDelCheckCategory(e.target.value as CheckCategory)}
              helperText="Required check rigour — Phase 1 gates issue on the matching sign-off chain"
            >
              {CHECK_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {CHECK_CATEGORY_LABEL[c]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !delTitle.trim() || !selectedId || !detail?.code || createDeliverable.isPending
            }
            onClick={() =>
              selectedId &&
              createDeliverable.mutate({
                engagementId: selectedId,
                docType: delDocType,
                title: delTitle.trim(),
                discipline: delDiscipline,
                revision: delRevision.trim() || "P01",
                issueClass: delIssueClass,
                checkCategory: delCheckCategory,
              })
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </RailLayout>
  );
}
