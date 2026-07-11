import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  styled,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  BUDGET_MODE_LABEL,
  BudgetMode,
  CLIENT_APPROVAL_STATUS_LABEL,
  CLIENT_APPROVAL_STATUS_TAG,
  COMMUNICATION_PREFERENCE_LABEL,
  CommunicationPreference,
  DECISION_MAKERS_LABEL,
  DESIGN_FLEXIBILITY_LABEL,
  DESIGN_LANGUAGE_LABEL,
  DecisionMakers,
  DesignFlexibility,
  DesignLanguage,
  MATERIAL_EXPECTATION_LABEL,
  MaterialExpectation,
  NEGOTIATION_OUTCOME_LABEL,
  NEGOTIATION_OUTCOME_TAG,
  NegotiationOutcome,
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TAG,
  REVISION_TOLERANCE_LABEL,
  RISK_BAND_LABEL,
  RISK_BAND_TAG,
  RevisionTolerance,
  TIMELINE_CRITICALITY_LABEL,
  TimelineCriticality,
  VASTU_REQUIREMENT_LABEL,
  VastuRequirement,
  can,
  formatINR,
  type ClientApprovalStatus,
  type OnboardingStatus,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

const HiddenFileInput = styled("input")({ display: "none" });

const PDF_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  NONE: "gray",
  PENDING: "blue",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

export function ProjectPipeline({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          Acquisition pipeline
        </Typography>
        <RiskBadge projectId={projectId} />
      </Box>
      <div>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Project DNA</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DnaSection projectId={projectId} canWrite={canWrite} />
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Feasibility — assessment &amp; report</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AssessmentSection projectId={projectId} canWrite={canWrite} />
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Negotiation</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <NegotiationSection projectId={projectId} canWrite={canWrite} />
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Client onboarding</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <OnboardingSection projectId={projectId} canWrite={canWrite} />
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Activation</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ActivationSection projectId={projectId} canWrite={canWrite} />
          </AccordionDetails>
        </Accordion>
      </div>
    </Stack>
  );
}

// ── Risk score badge (Slice E) ───────────────────────────────────────────────
function RiskBadge({ projectId }: { projectId: string }) {
  const q = trpc.projectDna.riskScore.useQuery({ projectId }, { retry: false });
  if (!q.data) return null;
  const band = q.data.band as keyof typeof RISK_BAND_LABEL;
  return (
    <StatusDot
      color={RISK_BAND_TAG[band] ?? "gray"}
      label={`Risk ${q.data.score} · ${RISK_BAND_LABEL[band] ?? band}`}
    />
  );
}

// ── Project DNA (Slice B) ─────────────────────────────────────────────────────
function DnaSection({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const utils = trpc.useUtils();
  const q = trpc.projectDna.byProject.useQuery({ projectId });
  const [form, setForm] = useState({
    budgetMode: "MODERATE",
    vastuRequirement: "NONE",
    designLanguage: "CONTEMPORARY",
    designFlexibility: "ARCHITECT_FREEDOM",
    decisionMakers: "SINGLE_OWNER",
    timelineCriticality: "MODERATE",
    materialExpectation: "MID_RANGE",
    revisionTolerance: "MODERATE",
    customNotes: "",
  });
  useEffect(() => {
    if (q.data) {
      setForm({
        budgetMode: q.data.budgetMode,
        vastuRequirement: q.data.vastuRequirement,
        designLanguage: q.data.designLanguage,
        designFlexibility: q.data.designFlexibility,
        decisionMakers: q.data.decisionMakers,
        timelineCriticality: q.data.timelineCriticality,
        materialExpectation: q.data.materialExpectation,
        revisionTolerance: q.data.revisionTolerance,
        customNotes: q.data.customNotes ?? "",
      });
    }
  }, [q.data]);

  const save = trpc.projectDna.upsert.useMutation({
    onSuccess: () => {
      utils.projectDna.byProject.invalidate({ projectId });
      utils.projectDna.riskScore.invalidate({ projectId });
    },
  });

  const fields: { key: keyof typeof form; label: string; opts: readonly string[]; labels: Record<string, string> }[] = [
    { key: "budgetMode", label: "Budget mode", opts: BudgetMode.options, labels: BUDGET_MODE_LABEL },
    { key: "vastuRequirement", label: "Vastu requirement", opts: VastuRequirement.options, labels: VASTU_REQUIREMENT_LABEL },
    { key: "designLanguage", label: "Design language", opts: DesignLanguage.options, labels: DESIGN_LANGUAGE_LABEL },
    { key: "designFlexibility", label: "Design flexibility", opts: DesignFlexibility.options, labels: DESIGN_FLEXIBILITY_LABEL },
    { key: "decisionMakers", label: "Decision makers", opts: DecisionMakers.options, labels: DECISION_MAKERS_LABEL },
    { key: "timelineCriticality", label: "Timeline criticality", opts: TimelineCriticality.options, labels: TIMELINE_CRITICALITY_LABEL },
    { key: "materialExpectation", label: "Material expectation", opts: MaterialExpectation.options, labels: MATERIAL_EXPECTATION_LABEL },
    { key: "revisionTolerance", label: "Revision tolerance", opts: RevisionTolerance.options, labels: REVISION_TOLERANCE_LABEL },
  ];

  return (
    <Stack spacing={2}>
      <p className="esti-label--secondary">Pre-sales constraints that drive the deterministic risk score.</p>
      <Grid container spacing={2}>
        {fields.map((f) => (
          <Grid key={f.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              id={`dna-${f.key}`}
              select
              label={f.label}
              value={form[f.key]}
              disabled={!canWrite}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              fullWidth
            >
              {f.opts.map((o) => (
                <MenuItem key={o} value={o}>
                  {f.labels[o] ?? o}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
      </Grid>
      <TextField
        id="dna-notes"
        label="Notes (optional)"
        multiline
        rows={2}
        value={form.customNotes}
        disabled={!canWrite}
        onChange={(e) => setForm({ ...form, customNotes: e.target.value })}
        fullWidth
      />
      {canWrite && (
        <div>
          <Button
            variant="contained"
            size="small"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                projectId,
                budgetMode: form.budgetMode as (typeof BudgetMode.options)[number],
                vastuRequirement: form.vastuRequirement as (typeof VastuRequirement.options)[number],
                designLanguage: form.designLanguage as (typeof DesignLanguage.options)[number],
                designFlexibility: form.designFlexibility as (typeof DesignFlexibility.options)[number],
                decisionMakers: form.decisionMakers as (typeof DecisionMakers.options)[number],
                timelineCriticality: form.timelineCriticality as (typeof TimelineCriticality.options)[number],
                materialExpectation: form.materialExpectation as (typeof MaterialExpectation.options)[number],
                revisionTolerance: form.revisionTolerance as (typeof RevisionTolerance.options)[number],
                customNotes: form.customNotes || undefined,
              })
            }
          >
            {save.isPending ? "Saving…" : q.data ? "Update DNA" : "Save DNA"}
          </Button>
        </div>
      )}
    </Stack>
  );
}

// ── Assessment + feasibility (Slices C + D) ───────────────────────────────────
function AssessmentSection({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const utils = trpc.useUtils();
  const q = trpc.assessment.byProject.useQuery({ projectId });
  const a = q.data;
  const [f, setF] = useState({
    siteLength: "", siteWidth: "", manualArea: "", farFactor: "1.75",
    frontSetback: "0", rearSetback: "0", leftSetback: "0", rightSetback: "0",
    groundCoveragePct: "60", superBuiltupFactor: "1.25", constructionRate: "",
  });
  useEffect(() => {
    if (a) {
      setF({
        siteLength: a.siteLength != null ? String(a.siteLength) : "",
        siteWidth: a.siteWidth != null ? String(a.siteWidth) : "",
        manualArea: a.manualArea != null ? String(a.manualArea) : "",
        farFactor: String(a.farFactor),
        frontSetback: String(a.frontSetback), rearSetback: String(a.rearSetback),
        leftSetback: String(a.leftSetback), rightSetback: String(a.rightSetback),
        groundCoveragePct: String(a.groundCoveragePct), superBuiltupFactor: String(a.superBuiltupFactor),
        constructionRate: a.constructionRatePaise ? String(a.constructionRatePaise / 100) : "",
      });
    }
  }, [a]);

  const save = trpc.assessment.upsert.useMutation({
    onSuccess: () => utils.assessment.byProject.invalidate({ projectId }),
  });

  const numFields: { key: keyof typeof f; label: string }[] = [
    { key: "siteLength", label: "Site length (m)" },
    { key: "siteWidth", label: "Site width (m)" },
    { key: "manualArea", label: "Manual area (sqm, optional)" },
    { key: "farFactor", label: "FAR factor" },
    { key: "frontSetback", label: "Front setback (m)" },
    { key: "rearSetback", label: "Rear setback (m)" },
    { key: "leftSetback", label: "Left setback (m)" },
    { key: "rightSetback", label: "Right setback (m)" },
    { key: "groundCoveragePct", label: "Ground coverage (%)" },
    { key: "superBuiltupFactor", label: "Super-builtup factor" },
    { key: "constructionRate", label: "Construction rate (₹/sqm)" },
  ];

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {numFields.map((nf) => (
          <Grid key={nf.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              id={`as-${nf.key}`}
              type="number"
              label={nf.label}
              value={f[nf.key]}
              disabled={!canWrite}
              onChange={(e) => setF({ ...f, [nf.key]: e.target.value })}
              fullWidth
            />
          </Grid>
        ))}
      </Grid>
      {canWrite && (
        <div>
          <Button
            variant="contained"
            size="small"
            disabled={save.isPending || !f.farFactor}
            onClick={() =>
              save.mutate({
                projectId,
                siteLength: f.siteLength ? Number(f.siteLength) : undefined,
                siteWidth: f.siteWidth ? Number(f.siteWidth) : undefined,
                manualArea: f.manualArea ? Number(f.manualArea) : undefined,
                farFactor: Number(f.farFactor),
                frontSetback: Number(f.frontSetback || 0),
                rearSetback: Number(f.rearSetback || 0),
                leftSetback: Number(f.leftSetback || 0),
                rightSetback: Number(f.rightSetback || 0),
                groundCoveragePct: Number(f.groundCoveragePct || 0),
                superBuiltupFactor: Number(f.superBuiltupFactor || 1.25),
                constructionRatePaise: Math.round(Number(f.constructionRate || 0) * 100),
              })
            }
          >
            {save.isPending ? "Computing…" : a ? "Recompute assessment" : "Compute assessment"}
          </Button>
        </div>
      )}

      {a && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" component="h4">
            Computed feasibility
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {[
                  ["Site area", `${fmt(a.siteAreaSqm)} sqm`],
                  ["Permissible FAR area", `${fmt(a.permissibleFarArea)} sqm`],
                  ["Setback-buildable area", `${fmt(a.setbackBuildableArea)} sqm`],
                  ["Ground coverage", `${fmt(a.actualGroundCoverage)} sqm`],
                  ["Possible floors", fmt(a.possibleFloors)],
                  ["Super-builtup area", `${fmt(a.superBuiltupArea)} sqm`],
                  ["Estimated project cost", formatINR(a.estimatedProjectCostPaise, { paise: false })],
                ].map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell>{k}</TableCell>
                    <TableCell>{v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {a && <FeasibilityReport projectId={projectId} canWrite={canWrite} />}
    </Stack>
  );
}

function FeasibilityReport({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const utils = trpc.useUtils();
  const q = trpc.feasibility.byProject.useQuery(
    { projectId },
    {
      refetchInterval: (query) =>
        query.state.data && (query.state.data.pdfStatus === "PENDING" || query.state.data.pdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );
  const [timeline, setTimeline] = useState("");
  const gen = trpc.feasibility.generate.useMutation({
    onSuccess: () => utils.feasibility.byProject.invalidate({ projectId }),
  });
  const status = q.data?.pdfStatus ?? "NONE";

  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
      <TextField
        id="feas-timeline"
        label="Estimated timeline (optional)"
        placeholder="e.g. 14–16 months"
        value={timeline}
        disabled={!canWrite}
        onChange={(e) => setTimeline(e.target.value)}
      />
      {canWrite && (
        <Button
          variant="contained"
          size="small"
          disabled={gen.isPending}
          onClick={() => gen.mutate({ projectId, estimatedTimeline: timeline || undefined })}
        >
          {gen.isPending ? "Queuing…" : "Generate feasibility PDF"}
        </Button>
      )}
      <StatusDot color={PDF_TAG[status] ?? "gray"} label={`PDF: ${status}`} />
      {gen.error && (
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {gen.error.message}
        </Alert>
      )}
    </Box>
  );
}

// ── Negotiation (Slice H) ─────────────────────────────────────────────────────
function NegotiationSection({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const utils = trpc.useUtils();
  const q = trpc.negotiation.listByProject.useQuery({ projectId });
  const rounds = q.data ?? [];
  const [open, setOpen] = useState(false);
  const blank = { feeChange: "", discount: "", scopeChanges: "", timelineChanges: "", architectResponse: "", clientResponse: "", outcome: "ONGOING" };
  const [form, setForm] = useState(blank);
  const add = trpc.negotiation.addRound.useMutation({
    onSuccess: () => { utils.negotiation.listByProject.invalidate({ projectId }); setOpen(false); setForm(blank); },
  });

  const roundColumns: GridColDef[] = [
    { field: "roundNo", headerName: "Round", width: 90 },
    {
      field: "feeChangePaise",
      headerName: "Fee change",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => formatINR(p.row.feeChangePaise, { paise: false }),
    },
    {
      field: "discountRequestedPct",
      headerName: "Discount",
      width: 110,
      renderCell: (p) => `${Number(p.row.discountRequestedPct)}%`,
    },
    {
      field: "outcome",
      headerName: "Outcome",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusDot
          color={NEGOTIATION_OUTCOME_TAG[p.row.outcome as keyof typeof NEGOTIATION_OUTCOME_TAG] ?? "gray"}
          label={NEGOTIATION_OUTCOME_LABEL[p.row.outcome as keyof typeof NEGOTIATION_OUTCOME_LABEL] ?? p.row.outcome}
        />
      ),
    },
    {
      field: "conversionProbability",
      headerName: "Conv. prob.",
      width: 110,
      renderCell: (p) => `${p.row.conversionProbability}%`,
    },
  ];

  return (
    <Stack spacing={2}>
      {canWrite && (
        <div>
          <Button variant="contained" size="small" onClick={() => setOpen(true)}>
            Add negotiation round
          </Button>
        </div>
      )}
      {rounds.length === 0 ? (
        <p className="esti-label--secondary">No negotiation rounds recorded.</p>
      ) : (
        <DataGrid
          rows={rounds}
          columns={roundColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      )}

      <Dialog aria-labelledby="project-pipeline-round-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="project-pipeline-round-title">Add negotiation round</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="ng-fee" type="number" label="Fee change (₹, negative = discount given)" value={form.feeChange} onChange={(e) => setForm({ ...form, feeChange: e.target.value })} fullWidth />
            <TextField id="ng-disc" type="number" label="Discount requested (%)" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} fullWidth />
            <TextField id="ng-scope" label="Scope changes" multiline rows={2} value={form.scopeChanges} onChange={(e) => setForm({ ...form, scopeChanges: e.target.value })} fullWidth />
            <TextField id="ng-time" label="Timeline changes" multiline rows={2} value={form.timelineChanges} onChange={(e) => setForm({ ...form, timelineChanges: e.target.value })} fullWidth />
            <TextField id="ng-arch" label="Architect response" multiline rows={2} value={form.architectResponse} onChange={(e) => setForm({ ...form, architectResponse: e.target.value })} fullWidth />
            <TextField id="ng-client" label="Client response" multiline rows={2} value={form.clientResponse} onChange={(e) => setForm({ ...form, clientResponse: e.target.value })} fullWidth />
            <TextField id="ng-out" select label="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} fullWidth>
              {NegotiationOutcome.options.map((o) => (
                <MenuItem key={o} value={o}>
                  {NEGOTIATION_OUTCOME_LABEL[o]}
                </MenuItem>
              ))}
            </TextField>
            {add.error && (
              <Alert severity="error">
                <AlertTitle>Error</AlertTitle>
                {add.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={add.isPending}
            onClick={() =>
              add.mutate({
                projectId,
                feeChangePaise: Math.round(Number(form.feeChange || 0) * 100),
                discountRequestedPct: Number(form.discount || 0),
                scopeChanges: form.scopeChanges || undefined,
                timelineChanges: form.timelineChanges || undefined,
                architectResponse: form.architectResponse || undefined,
                clientResponse: form.clientResponse || undefined,
                outcome: form.outcome as (typeof NegotiationOutcome.options)[number],
              })
            }
          >
            {add.isPending ? "Saving…" : "Add round"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// ── Onboarding (Slice J) ──────────────────────────────────────────────────────
function OnboardingSection({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { authorizedFetch } = useUploadAuth();
  const utils = trpc.useUtils();
  const q = trpc.onboarding.byProject.useQuery({ projectId });
  const o = q.data;
  const [form, setForm] = useState({ billingAddress: "", gstin: "", pan: "", communicationPreference: "EMAIL", repName: "", repPhone: "" });
  useEffect(() => {
    if (o) {
      const reps = (o.authorizedReps as { name: string; phone?: string }[] | null) ?? [];
      setForm({
        billingAddress: o.billingAddress ?? "",
        gstin: o.gstin ?? "",
        pan: o.pan ?? "",
        communicationPreference: o.communicationPreference ?? "EMAIL",
        repName: reps[0]?.name ?? "",
        repPhone: reps[0]?.phone ?? "",
      });
    }
  }, [o]);

  const inv = () => utils.onboarding.byProject.invalidate({ projectId });
  const save = trpc.onboarding.upsert.useMutation({ onSuccess: inv });
  const complete = trpc.onboarding.complete.useMutation({ onSuccess: inv });
  const reopen = trpc.onboarding.reopen.useMutation({ onSuccess: inv });
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  async function upload(slot: "agreement" | "id", file: File) {
    const res = await authorizedFetch("/upload/onboarding-document", (fd) => {
      fd.append("file", file);
      fd.append("projectId", projectId);
      fd.append("slot", slot);
    });
    if (res.ok) { setUploadMsg(`${slot === "agreement" ? "Agreement" : "ID"} uploaded`); inv(); }
    else { const e = await res.json().catch(() => ({ error: "Upload failed" })); setUploadMsg(e.error ?? "Upload failed"); }
  }

  const status = (o?.status ?? "PENDING") as OnboardingStatus;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <StatusDot
          color={ONBOARDING_STATUS_TAG[status] ?? "gray"}
          label={ONBOARDING_STATUS_LABEL[status] ?? status}
        />
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField id="ob-addr" label="Billing address" multiline rows={2} value={form.billingAddress} disabled={!canWrite} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField id="ob-gstin" label="GSTIN" value={form.gstin} disabled={!canWrite} onChange={(e) => setForm({ ...form, gstin: e.target.value })} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField id="ob-pan" label="PAN" value={form.pan} disabled={!canWrite} onChange={(e) => setForm({ ...form, pan: e.target.value })} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField id="ob-comm" select label="Communication preference" value={form.communicationPreference} disabled={!canWrite} onChange={(e) => setForm({ ...form, communicationPreference: e.target.value })} fullWidth>
            {CommunicationPreference.options.map((c) => (
              <MenuItem key={c} value={c}>
                {COMMUNICATION_PREFERENCE_LABEL[c]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField id="ob-rep" label="Authorized rep" value={form.repName} disabled={!canWrite} onChange={(e) => setForm({ ...form, repName: e.target.value })} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField id="ob-rep-ph" label="Rep phone" value={form.repPhone} disabled={!canWrite} onChange={(e) => setForm({ ...form, repPhone: e.target.value })} fullWidth />
        </Grid>
      </Grid>

      {canWrite && (
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            variant="outlined"
            size="small"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                projectId,
                billingAddress: form.billingAddress || undefined,
                gstin: form.gstin || undefined,
                pan: form.pan || undefined,
                communicationPreference: form.communicationPreference as (typeof CommunicationPreference.options)[number],
                authorizedReps: form.repName ? [{ name: form.repName, phone: form.repPhone || undefined }] : undefined,
              })
            }
          >
            {save.isPending ? "Saving…" : "Save details"}
          </Button>
          <Button variant="outlined" size="small" component="label">
            {o?.agreementDocKey ? "Replace agreement" : "Upload agreement"}
            <HiddenFileInput
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void upload("agreement", file);
              }}
            />
          </Button>
          <Button variant="outlined" size="small" component="label">
            {o?.idDocKey ? "Replace ID proof" : "Upload ID proof"}
            <HiddenFileInput
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void upload("id", file);
              }}
            />
          </Button>
          {status === "PENDING" ? (
            <Button variant="contained" size="small" disabled={complete.isPending} onClick={() => complete.mutate({ projectId })}>
              Mark onboarding complete
            </Button>
          ) : (
            <Button variant="text" color="error" size="small" disabled={reopen.isPending} onClick={() => reopen.mutate({ projectId })}>
              Reopen onboarding
            </Button>
          )}
        </Box>
      )}
      {uploadMsg && (
        <Alert severity="info" onClose={() => setUploadMsg(null)}>
          {uploadMsg}
        </Alert>
      )}
    </Stack>
  );
}

// ── Activation gate (Slice K) ─────────────────────────────────────────────────
function ActivationSection({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const utils = trpc.useUtils();
  const q = trpc.projectOffice.activationStatus.useQuery({ id: projectId });
  const gate = q.data;
  const activate = trpc.projectOffice.activate.useMutation({
    onSuccess: () => {
      utils.projectOffice.activationStatus.invalidate({ id: projectId });
      utils.projectOffice.byId.invalidate({ id: projectId });
    },
  });
  // Also surface the fee-proposal approval gate inline.
  const feesQ = trpc.proposals.listByProject.useQuery({ projectId }, { retry: false });
  const fees = feesQ.data ?? [];

  return (
    <Stack spacing={2}>
      <p className="esti-label--secondary">A project becomes ACTIVE only when every gate below is met.</p>
      {gate && (
        <TableContainer>
          <Table size="small">
            <TableBody>
              {gate.checks.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>
                    <StatusDot
                      color={c.ok ? "green" : "gray"}
                      label={c.ok ? "Met" : "Pending"}
                    />
                  </TableCell>
                  <TableCell>{c.label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FeeApprovalRows fees={fees} projectId={projectId} canWrite={canWrite} />

      {canWrite && (
        <div>
          <Button
            variant="contained"
            disabled={!gate?.ok || activate.isPending}
            onClick={() => activate.mutate({ id: projectId })}
          >
            {activate.isPending ? "Activating…" : "Activate project"}
          </Button>
          {activate.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <AlertTitle>Cannot activate</AlertTitle>
              {activate.error.message}
            </Alert>
          )}
          {activate.data?.ok && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <AlertTitle>Activated</AlertTitle>
              Project is now ACTIVE; a kick-off task was created.
            </Alert>
          )}
        </div>
      )}
    </Stack>
  );
}

// ── Fee-proposal client approval (Slice I) ────────────────────────────────────
function FeeApprovalRows({
  fees,
  projectId,
  canWrite,
}: {
  fees: { id: string; ref: string; clientApprovalStatus: string }[];
  projectId: string;
  canWrite: boolean;
}) {
  const utils = trpc.useUtils();
  const setApproval = trpc.proposals.setClientApproval.useMutation({
    onSuccess: () => {
      utils.proposals.listByProject.invalidate({ projectId });
      utils.projectOffice.activationStatus.invalidate({ id: projectId });
    },
  });
  const options = useMemo(() => ["PENDING", "APPROVED", "REJECTED", "ON_HOLD"] as ClientApprovalStatus[], []);
  if (fees.length === 0)
    return <p className="esti-label--secondary">No fee proposals yet — create one in the Accounting → Fee proposals area.</p>;

  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle1" component="h4">
        Fee proposal — client approval
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ref</TableCell>
              <TableCell>Approval</TableCell>
              {canWrite && <TableCell>Set</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {fees.map((fp) => {
              const st = fp.clientApprovalStatus as ClientApprovalStatus;
              return (
                <TableRow key={fp.id}>
                  <TableCell>{fp.ref}</TableCell>
                  <TableCell>
                    <StatusDot
                      color={CLIENT_APPROVAL_STATUS_TAG[st] ?? "gray"}
                      label={CLIENT_APPROVAL_STATUS_LABEL[st] ?? st}
                    />
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <TextField
                        id={`fa-${fp.id}`}
                        select
                        hiddenLabel
                        size="small"
                        value={st}
                        disabled={setApproval.isPending}
                        slotProps={{
                          htmlInput: { "aria-label": "Set client approval" },
                        }}
                        onChange={(e) => setApproval.mutate({ id: fp.id, clientApprovalStatus: e.target.value as ClientApprovalStatus })}
                      >
                        {options.map((o) => (
                          <MenuItem key={o} value={o}>
                            {CLIENT_APPROVAL_STATUS_LABEL[o]}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
