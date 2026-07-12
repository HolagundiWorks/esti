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
import { useState } from "react";
import {
  CHECK_CATEGORY_LABEL,
  CHECK_CATEGORY_REQUIRED_STEPS,
  CONS_DELIVERABLE_STATUS_TAG,
  CONS_GRADE_LABEL,
  ConsGrade,
  CONS_ENGAGEMENT_STATUS_TAG,
  CONS_FEE_STAGE_STATUS_TAG,
  CONS_TQ_STATUS_TAG,
  CONS_VARIATION_STATUS_TAG,
  CheckCategory,
  ConsEngagementStatus,
  DeliverableStatus,
  ENGAGEMENT_MODEL_LABEL,
  ENGINEERING_DISCIPLINE_LABEL,
  EngagementModel,
  EngineeringDiscipline,
  FEE_MODEL_LABEL,
  FeeModel,
  FeeStageStatus,
  ISSUE_CLASS_LABEL,
  IssueClass,
  REVIEW_STEP_LABEL,
  ReviewStepKind,
  TqStatus,
  VariationStatus,
  formatINR,
} from "@esti/contracts";
import { useScreenActions, type DockAction } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot, StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const MODELS = EngagementModel.options;
const DISCIPLINES = EngineeringDiscipline.options;
const ISSUE_CLASSES = IssueClass.options;
const CHECK_CATEGORIES = CheckCategory.options;

/**
 * AORMS-Consultancy — Phase 0 "Living record" workspace (preview): engineering
 * engagements + the deliverable register. Register lifecycle only — the
 * originate→check→approve sign-off chain arrives with Phase 1.
 * Design: docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 */
export function ConsultancyEngagements() {
  const utils = trpc.useUtils();
  const listQ = trpc.consultancy.engagements.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Built-in PDF export.
  const exportPdf = trpc.consultancy.engagements.exportPdf.useMutation({
    meta: { errorTitle: "Couldn't start the PDF export" },
    onSuccess: invalidate,
  });

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
  const removeFeeStage = trpc.consultancy.feeStages.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the fee stage" },
    onSuccess: invalidate,
  });

  // New-engagement dialog state.
  const [engOpen, setEngOpen] = useState(false);
  const [engTitle, setEngTitle] = useState("");
  const [engModel, setEngModel] = useState<EngagementModel>("FULL_DESIGN");
  const [engDiscipline, setEngDiscipline] = useState<EngineeringDiscipline>("STRUCTURAL");
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
  const [tqScopeImpact, setTqScopeImpact] = useState(false);
  const [tqAnswerFor, setTqAnswerFor] = useState<string | null>(null);
  const [tqAnswerText, setTqAnswerText] = useState("");
  const [tqCloseFor, setTqCloseFor] = useState<string | null>(null);
  const [tqCloseNote, setTqCloseNote] = useState("");

  // New-deliverable dialog state.
  const [delOpen, setDelOpen] = useState(false);
  const [delCode, setDelCode] = useState("");
  const [delTitle, setDelTitle] = useState("");
  const [delDiscipline, setDelDiscipline] = useState<EngineeringDiscipline>("STRUCTURAL");
  const [delRevision, setDelRevision] = useState("A");
  const [delIssueClass, setDelIssueClass] = useState<IssueClass>("FOR_INFORMATION");
  const [delCheckCategory, setDelCheckCategory] = useState<CheckCategory>("CAT1");

  const anyDialogOpen =
    engOpen || delOpen || tqOpen || feeOpen || timeOpen || ratesOpen || voOpen ||
    !!tqAnswerFor || !!tqCloseFor;
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
                    setDelCode("");
                    setDelTitle("");
                    setDelRevision("A");
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
                  id: "cons-rate-card",
                  zone: "right",
                  label: "Rate card",
                  onClick: () => {
                    const draft: Record<string, string> = {};
                    for (const r of rateCardQ.data ?? [])
                      draft[r.grade] = String((r.ratePaise ?? 0) / 100);
                    setRateDraft(draft);
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

  return (
    <RailLayout
      title="Engagements"
      description="AORMS-Consultancy · Phase 0 living record (preview)"
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
                      {detail.title}
                    </Typography>
                    <span className="esti-label esti-label--secondary">
                      {ENGAGEMENT_MODEL_LABEL[detail.model as EngagementModel] ?? detail.model} ·
                      lead:{" "}
                      {ENGINEERING_DISCIPLINE_LABEL[
                        detail.leadDiscipline as EngineeringDiscipline
                      ] ?? detail.leadDiscipline}
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
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.deliverables.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>
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
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusTag
                            value={d.status as DeliverableStatus}
                            map={CONS_DELIVERABLE_STATUS_TAG}
                          />
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
                  {detail.feeModel
                    ? `${FEE_MODEL_LABEL[detail.feeModel as FeeModel] ?? detail.feeModel} · agreed ${formatINR(detail.feePosition.agreedPaise)}`
                    : "No fee model recorded"}
                  {` · staged ${formatINR(detail.feePosition.stagedPaise)} · billable ${formatINR(detail.feePosition.billablePaise)} · invoiced ${formatINR(detail.feePosition.invoicedPaise)}`}
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
                                <StatusTag
                                  value={f.status as FeeStageStatus}
                                  map={CONS_FEE_STAGE_STATUS_TAG}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <RowActionsMenu
                                  actions={[
                                    ...(f.status === "BILLABLE"
                                      ? [
                                          {
                                            label: "Mark invoiced",
                                            disabled: markInvoiced.isPending,
                                            onClick: () => markInvoiced.mutate({ id: f.id }),
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

              {/* Time booked — substrate for WIP / utilisation / realisation. */}
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Time
                </Typography>
                <span className="esti-label esti-label--secondary">
                  {`${detail.feePosition.hoursBooked}h booked · value ${formatINR(detail.feePosition.timeValuePaise)} · WIP ${formatINR(detail.feePosition.wipPaise)}`}
                </span>
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
                            <TableCell>{t.userName}</TableCell>
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
                            <TableCell>{t.code}</TableCell>
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
            </Stack>
          )}
        </Grid>
      </Grid>

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
      <Dialog open={ratesOpen} onClose={() => setRatesOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rate card (₹/hour)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {ConsGrade.options.map((g) => (
              <TextField
                key={g}
                id={`cons-rate-${g}`}
                label={CONS_GRADE_LABEL[g]}
                value={rateDraft[g] ?? ""}
                onChange={(e) => setRateDraft((d) => ({ ...d, [g]: e.target.value }))}
                size="small"
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
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

      {/* New deliverable */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add deliverable</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-del-code"
              label="Register code"
              placeholder="e.g. STR-CAL-001"
              value={delCode}
              onChange={(e) => setDelCode(e.target.value)}
              autoFocus
            />
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
              !delCode.trim() || !delTitle.trim() || !selectedId || createDeliverable.isPending
            }
            onClick={() =>
              selectedId &&
              createDeliverable.mutate({
                engagementId: selectedId,
                code: delCode.trim(),
                title: delTitle.trim(),
                discipline: delDiscipline,
                revision: delRevision.trim() || "A",
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
