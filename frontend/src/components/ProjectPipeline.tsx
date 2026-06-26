import {
  Accordion,
  AccordionItem,
  Button,
  Column,
  FileUploaderButton,
  Grid,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
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
import { apiUrl, authHeaders } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";

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
    <Stack gap={6}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
        <h4 style={{ margin: 0 }}>Acquisition pipeline</h4>
        <RiskBadge projectId={projectId} />
      </div>
      <Accordion>
        <AccordionItem title="Project DNA" open>
          <DnaSection projectId={projectId} canWrite={canWrite} />
        </AccordionItem>
        <AccordionItem title="Feasibility — assessment & report">
          <AssessmentSection projectId={projectId} canWrite={canWrite} />
        </AccordionItem>
        <AccordionItem title="Negotiation">
          <NegotiationSection projectId={projectId} canWrite={canWrite} />
        </AccordionItem>
        <AccordionItem title="Client onboarding">
          <OnboardingSection projectId={projectId} canWrite={canWrite} />
        </AccordionItem>
        <AccordionItem title="Activation" open>
          <ActivationSection projectId={projectId} canWrite={canWrite} />
        </AccordionItem>
      </Accordion>
    </Stack>
  );
}

// ── Risk score badge (Slice E) ───────────────────────────────────────────────
function RiskBadge({ projectId }: { projectId: string }) {
  const q = trpc.projectDna.riskScore.useQuery({ projectId }, { retry: false });
  if (!q.data) return null;
  const band = q.data.band as keyof typeof RISK_BAND_LABEL;
  return (
    <Tag type={RISK_BAND_TAG[band] ?? "gray"} size="sm">
      Risk {q.data.score} · {RISK_BAND_LABEL[band] ?? band}
    </Tag>
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
    <Stack gap={5}>
      <p className="esti-label--secondary">Pre-sales constraints that drive the deterministic risk score.</p>
      <Grid condensed>
        {fields.map((f) => (
          <Column key={f.key} sm={4} md={4} lg={4}>
            <Select
              id={`dna-${f.key}`}
              labelText={f.label}
              value={form[f.key]}
              disabled={!canWrite}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            >
              {f.opts.map((o) => <SelectItem key={o} value={o} text={f.labels[o] ?? o} />)}
            </Select>
          </Column>
        ))}
      </Grid>
      <TextArea
        id="dna-notes"
        labelText="Notes (optional)"
        rows={2}
        value={form.customNotes}
        disabled={!canWrite}
        onChange={(e) => setForm({ ...form, customNotes: e.target.value })}
      />
      {canWrite && (
        <div>
          <Button
            size="sm"
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
    <Stack gap={5}>
      <Grid condensed>
        {numFields.map((nf) => (
          <Column key={nf.key} sm={4} md={4} lg={4}>
            <TextInput
              id={`as-${nf.key}`}
              type="number"
              labelText={nf.label}
              value={f[nf.key]}
              disabled={!canWrite}
              onChange={(e) => setF({ ...f, [nf.key]: e.target.value })}
            />
          </Column>
        ))}
      </Grid>
      {canWrite && (
        <div>
          <Button
            size="sm"
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
        <TableContainer title="Computed feasibility">
          <Table size="sm">
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
    <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
      <TextInput
        id="feas-timeline"
        labelText="Estimated timeline (optional)"
        placeholder="e.g. 14–16 months"
        value={timeline}
        disabled={!canWrite}
        onChange={(e) => setTimeline(e.target.value)}
      />
      {canWrite && (
        <Button
          size="sm"
          disabled={gen.isPending}
          onClick={() => gen.mutate({ projectId, estimatedTimeline: timeline || undefined })}
        >
          {gen.isPending ? "Queuing…" : "Generate feasibility PDF"}
        </Button>
      )}
      <Tag type={PDF_TAG[status] ?? "gray"} size="sm">PDF: {status}</Tag>
      {gen.error && <InlineNotification kind="error" title="Error" subtitle={gen.error.message} lowContrast />}
    </div>
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

  return (
    <Stack gap={4}>
      {canWrite && <div><Button size="sm" onClick={() => setOpen(true)}>Add negotiation round</Button></div>}
      {rounds.length === 0 ? (
        <p className="esti-label--secondary">No negotiation rounds recorded.</p>
      ) : (
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Round</TableHeader>
                <TableHeader>Fee change</TableHeader>
                <TableHeader>Discount</TableHeader>
                <TableHeader>Outcome</TableHeader>
                <TableHeader>Conv. prob.</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rounds.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.roundNo}</TableCell>
                  <TableCell>{formatINR(r.feeChangePaise, { paise: false })}</TableCell>
                  <TableCell>{Number(r.discountRequestedPct)}%</TableCell>
                  <TableCell>
                    <Tag type={NEGOTIATION_OUTCOME_TAG[r.outcome as keyof typeof NEGOTIATION_OUTCOME_TAG] ?? "gray"} size="sm">
                      {NEGOTIATION_OUTCOME_LABEL[r.outcome as keyof typeof NEGOTIATION_OUTCOME_LABEL] ?? r.outcome}
                    </Tag>
                  </TableCell>
                  <TableCell>{r.conversionProbability}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Modal
        open={open}
        modalHeading="Add negotiation round"
        primaryButtonText={add.isPending ? "Saving…" : "Add round"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={add.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
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
        <Stack gap={4}>
          <TextInput id="ng-fee" type="number" labelText="Fee change (₹, negative = discount given)" value={form.feeChange} onChange={(e) => setForm({ ...form, feeChange: e.target.value })} />
          <TextInput id="ng-disc" type="number" labelText="Discount requested (%)" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          <TextArea id="ng-scope" labelText="Scope changes" rows={2} value={form.scopeChanges} onChange={(e) => setForm({ ...form, scopeChanges: e.target.value })} />
          <TextArea id="ng-time" labelText="Timeline changes" rows={2} value={form.timelineChanges} onChange={(e) => setForm({ ...form, timelineChanges: e.target.value })} />
          <TextArea id="ng-arch" labelText="Architect response" rows={2} value={form.architectResponse} onChange={(e) => setForm({ ...form, architectResponse: e.target.value })} />
          <TextArea id="ng-client" labelText="Client response" rows={2} value={form.clientResponse} onChange={(e) => setForm({ ...form, clientResponse: e.target.value })} />
          <Select id="ng-out" labelText="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
            {NegotiationOutcome.options.map((o) => <SelectItem key={o} value={o} text={NEGOTIATION_OUTCOME_LABEL[o]} />)}
          </Select>
          {add.error && <InlineNotification kind="error" title="Error" subtitle={add.error.message} lowContrast />}
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Onboarding (Slice J) ──────────────────────────────────────────────────────
function OnboardingSection({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
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
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    fd.append("slot", slot);
    const res = await fetch(apiUrl("/upload/onboarding-document"), { method: "POST", body: fd, credentials: "include", headers: authHeaders() });
    if (res.ok) { setUploadMsg(`${slot === "agreement" ? "Agreement" : "ID"} uploaded`); inv(); }
    else { const e = await res.json().catch(() => ({ error: "Upload failed" })); setUploadMsg(e.error ?? "Upload failed"); }
  }

  const status = (o?.status ?? "PENDING") as OnboardingStatus;

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)" }}>
        <Tag type={ONBOARDING_STATUS_TAG[status] ?? "gray"} size="sm">{ONBOARDING_STATUS_LABEL[status] ?? status}</Tag>
      </div>
      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <TextArea id="ob-addr" labelText="Billing address" rows={2} value={form.billingAddress} disabled={!canWrite} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <TextInput id="ob-gstin" labelText="GSTIN" value={form.gstin} disabled={!canWrite} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <TextInput id="ob-pan" labelText="PAN" value={form.pan} disabled={!canWrite} onChange={(e) => setForm({ ...form, pan: e.target.value })} />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Select id="ob-comm" labelText="Communication preference" value={form.communicationPreference} disabled={!canWrite} onChange={(e) => setForm({ ...form, communicationPreference: e.target.value })}>
            {CommunicationPreference.options.map((c) => <SelectItem key={c} value={c} text={COMMUNICATION_PREFERENCE_LABEL[c]} />)}
          </Select>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <TextInput id="ob-rep" labelText="Authorized rep" value={form.repName} disabled={!canWrite} onChange={(e) => setForm({ ...form, repName: e.target.value })} />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <TextInput id="ob-rep-ph" labelText="Rep phone" value={form.repPhone} disabled={!canWrite} onChange={(e) => setForm({ ...form, repPhone: e.target.value })} />
        </Column>
      </Grid>

      {canWrite && (
        <div style={{ display: "flex", gap: "var(--cds-spacing-04)", flexWrap: "wrap", alignItems: "center" }}>
          <Button
            size="sm"
            kind="secondary"
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
          <FileUploaderButton
            labelText={o?.agreementDocKey ? "Replace agreement" : "Upload agreement"}
            buttonKind="tertiary"
            size="sm"
            disableLabelChanges
            accept={[".pdf", ".jpg", ".jpeg", ".png", ".webp"]}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload("agreement", file); }}
          />
          <FileUploaderButton
            labelText={o?.idDocKey ? "Replace ID proof" : "Upload ID proof"}
            buttonKind="tertiary"
            size="sm"
            disableLabelChanges
            accept={[".pdf", ".jpg", ".jpeg", ".png", ".webp"]}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload("id", file); }}
          />
          {status === "PENDING" ? (
            <Button size="sm" disabled={complete.isPending} onClick={() => complete.mutate({ projectId })}>
              Mark onboarding complete
            </Button>
          ) : (
            <Button size="sm" kind="danger--ghost" disabled={reopen.isPending} onClick={() => reopen.mutate({ projectId })}>
              Reopen onboarding
            </Button>
          )}
        </div>
      )}
      {uploadMsg && <InlineNotification kind="info" title="" subtitle={uploadMsg} lowContrast onClose={() => setUploadMsg(null)} />}
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
  const feesQ = trpc.feeProposals.listByProject.useQuery({ projectId }, { retry: false });
  const fees = feesQ.data ?? [];

  return (
    <Stack gap={5}>
      <p className="esti-label--secondary">A project becomes ACTIVE only when every gate below is met.</p>
      {gate && (
        <TableContainer>
          <Table size="sm">
            <TableBody>
              {gate.checks.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>
                    <Tag type={c.ok ? "green" : "gray"} size="sm">{c.ok ? "Met" : "Pending"}</Tag>
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
            disabled={!gate?.ok || activate.isPending}
            onClick={() => activate.mutate({ id: projectId })}
          >
            {activate.isPending ? "Activating…" : "Activate project"}
          </Button>
          {activate.error && (
            <InlineNotification kind="error" title="Cannot activate" subtitle={activate.error.message} lowContrast />
          )}
          {activate.data?.ok && (
            <InlineNotification kind="success" title="Activated" subtitle="Project is now ACTIVE; a kick-off task was created." lowContrast />
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
  const setApproval = trpc.feeProposals.setClientApproval.useMutation({
    onSuccess: () => {
      utils.feeProposals.listByProject.invalidate({ projectId });
      utils.projectOffice.activationStatus.invalidate({ id: projectId });
    },
  });
  const options = useMemo(() => ["PENDING", "APPROVED", "REJECTED", "ON_HOLD"] as ClientApprovalStatus[], []);
  if (fees.length === 0)
    return <p className="esti-label--secondary">No fee proposals yet — create one in the Accounting → Fee proposals area.</p>;

  return (
    <TableContainer title="Fee proposal — client approval">
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Ref</TableHeader>
            <TableHeader>Approval</TableHeader>
            {canWrite && <TableHeader>Set</TableHeader>}
          </TableRow>
        </TableHead>
        <TableBody>
          {fees.map((fp) => {
            const st = fp.clientApprovalStatus as ClientApprovalStatus;
            return (
              <TableRow key={fp.id}>
                <TableCell>{fp.ref}</TableCell>
                <TableCell>
                  <Tag type={CLIENT_APPROVAL_STATUS_TAG[st] ?? "gray"} size="sm">
                    {CLIENT_APPROVAL_STATUS_LABEL[st] ?? st}
                  </Tag>
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <Select
                      id={`fa-${fp.id}`}
                      size="sm"
                      labelText=""
                      hideLabel
                      value={st}
                      disabled={setApproval.isPending}
                      onChange={(e) => setApproval.mutate({ id: fp.id, clientApprovalStatus: e.target.value as ClientApprovalStatus })}
                    >
                      {options.map((o) => <SelectItem key={o} value={o} text={CLIENT_APPROVAL_STATUS_LABEL[o]} />)}
                    </Select>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
