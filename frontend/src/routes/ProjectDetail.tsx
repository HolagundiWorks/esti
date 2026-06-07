import {
  Button,
  Checkbox,
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
  TextInput,
} from "@carbon/react";
import {
  COA_MIN_FEE_PCT,
  CoaWorkCategory,
  GstSystem,
  InvoiceStatus,
  PhaseStatus,
  coaMinimumFee,
  computeGst,
  computeTds194j,
  formatINR,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { InvoicePdfCell } from "../components/InvoicePdfCell.js";
import { ProjectApprovals } from "../components/ProjectApprovals.js";
import { ProjectBylaws } from "../components/ProjectBylaws.js";
import { ProjectClientLog } from "../components/ProjectClientLog.js";
import { ProjectDrawings } from "../components/ProjectDrawings.js";
import { ProjectEngagements } from "../components/ProjectEngagements.js";
import { ProjectTeam } from "../components/ProjectTeam.js";
import { ProjectPermits } from "../components/ProjectPermits.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "purple" | "teal" | "green"> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  CLIENT_REVIEW: "purple",
  APPROVED: "teal",
  COMPLETE: "green",
};

export function ProjectDetail() {
  const { id = "" } = useParams();
  const utils = trpc.useUtils();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const hrEnabled = trpc.settings.get.useQuery().data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const feesQ = trpc.feeProposals.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const updatePhase = trpc.phases.update.useMutation({
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId: id }),
  });

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("RESIDENTIAL_INDIVIDUAL");
  const [cost, setCost] = useState("");
  const [fee, setFee] = useState("");
  const [docComm, setDocComm] = useState("10");
  const [override, setOverride] = useState("");

  const createFee = trpc.feeProposals.create.useMutation({
    onSuccess: () => {
      utils.feeProposals.listByProject.invalidate({ projectId: id });
      setOpen(false);
      setCost("");
      setFee("");
      setOverride("");
    },
  });

  const invoicesQ = trpc.invoices.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const [invOpen, setInvOpen] = useState(false);
  const [invPhase, setInvPhase] = useState("");
  const [invSystem, setInvSystem] = useState<string>("REGULAR");
  const [invTaxableR, setInvTaxableR] = useState("");
  const [invInter, setInvInter] = useState(false);
  const [invTdsOn, setInvTdsOn] = useState(true);
  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.listByProject.invalidate({ projectId: id });
      setInvOpen(false);
      setInvTaxableR("");
    },
  });
  const updateInvoiceStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoices.listByProject.invalidate({ projectId: id });
      utils.dashboard.summary.invalidate();
    },
  });

  if (project.isLoading) return <p>Loading…</p>;
  if (!project.data)
    return (
      <p>
        Project not found. <Link to="/projects">Back</Link>
      </p>
    );
  const p = project.data;

  // Live COA benchmark in the modal
  const costPaise = Math.round(Number(cost || "0") * 100);
  const feePaise = Math.round(Number(fee || "0") * 100);
  const coaMin = costPaise > 0 ? coaMinimumFee(category as keyof typeof COA_MIN_FEE_PCT, costPaise) : 0;
  const below = feePaise > 0 && coaMin > 0 && isBelowCoaMinimum(feePaise, coaMin);
  const ratioPct = coaMin > 0 ? Math.round((feePaise / coaMin) * 100) : 0;
  const docCommPaise = Math.round((feePaise * Number(docComm || "0")) / 100);

  // Live GST/TDS preview for the invoice modal
  const invTaxablePaise = Math.round(Number(invTaxableR || "0") * 100);
  const invSys = invSystem as (typeof GstSystem)[keyof typeof GstSystem];
  const invBreakup = computeGst(invSys, invTaxablePaise, invInter);
  const invTdsPaise = invTdsOn ? computeTds194j(invTaxablePaise) : 0;
  const invNet = invBreakup.grandTotal - invTdsPaise;

  return (
    <div>
      <Link to="/projects">← Projects</Link>
      <h1 style={{ marginTop: 8 }}>
        {p.ref} — {p.title}
      </h1>
      <p style={{ color: "var(--cds-text-secondary)" }}>
        {p.projectType} · {p.jurisdiction} · {p.status} ·{" "}
        {formatINR(p.contractValuePaise, { paise: false })}
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>COA phases</h3>
      <TableContainer title="Conditions of Engagement" description="Phase plan & billing schedule">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Stage</TableHeader>
              <TableHeader>Billing %</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Update</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(phasesQ.data ?? []).map((ph) => (
              <TableRow key={ph.id}>
                <TableCell>{ph.label}</TableCell>
                <TableCell>{ph.billingPct}%</TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[ph.status] ?? "gray"}>{ph.status}</Tag>
                </TableCell>
                <TableCell>
                  <Select
                    id={`st-${ph.id}`}
                    labelText=""
                    hideLabel
                    size="sm"
                    value={ph.status}
                    onChange={(e) =>
                      updatePhase.mutate({
                        id: ph.id,
                        status: e.target.value as (typeof PhaseStatus.options)[number],
                      })
                    }
                  >
                    {PhaseStatus.options.map((s) => (
                      <SelectItem key={s} value={s} text={s} />
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Fee proposals</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          New fee proposal
        </Button>
      </div>
      <TableContainer title="COA fee proposals" description="Benchmarked against the COA scale">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Cost of works</TableHeader>
              <TableHeader>Quoted fee</TableHeader>
              <TableHeader>COA min</TableHeader>
              <TableHeader>% of COA</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(feesQ.data ?? []).map((f) => {
              const pct = f.coaMinimumPaise > 0 ? Math.round((f.feePaise / f.coaMinimumPaise) * 100) : 0;
              return (
                <TableRow key={f.id}>
                  <TableCell>{f.ref}</TableCell>
                  <TableCell>{f.workCategory}</TableCell>
                  <TableCell>{formatINR(f.costOfWorksPaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(f.feePaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(f.coaMinimumPaise, { paise: false })}</TableCell>
                  <TableCell>
                    <Tag type={f.belowMinimum ? "red" : "green"}>{pct}%</Tag>
                  </TableCell>
                  <TableCell>{f.status}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Invoices (GST / TDS)</h3>
        <Button size="sm" onClick={() => setInvOpen(true)}>
          New invoice
        </Button>
      </div>
      <TableContainer title="India invoices" description="GST + TDS, phase-linked">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Document</TableHeader>
              <TableHeader>Taxable</TableHeader>
              <TableHeader>GST</TableHeader>
              <TableHeader>TDS</TableHeader>
              <TableHeader>Net receivable</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Document</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(invoicesQ.data ?? []).map((iv) => (
              <TableRow key={iv.id}>
                <TableCell>{iv.ref}</TableCell>
                <TableCell>{iv.documentKind}</TableCell>
                <TableCell>{formatINR(iv.taxablePaise, { paise: false })}</TableCell>
                <TableCell>{formatINR(iv.gstTotalPaise, { paise: false })}</TableCell>
                <TableCell>{formatINR(iv.tdsPaise, { paise: false })}</TableCell>
                <TableCell>{formatINR(iv.netReceivablePaise, { paise: false })}</TableCell>
                <TableCell>
                  <Select
                    id={`inv-status-${iv.id}`}
                    labelText=""
                    hideLabel
                    size="sm"
                    value={iv.status}
                    disabled={iv.status === "PAID" || iv.status === "CANCELLED"}
                    onChange={(e) =>
                      updateInvoiceStatus.mutate({
                        id: iv.id,
                        status: e.target.value as (typeof InvoiceStatus.options)[number],
                      })
                    }
                  >
                    {InvoiceStatus.options.map((st) => (
                      <SelectItem key={st} value={st} text={st} />
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <InvoicePdfCell invoiceId={iv.id} initialStatus={iv.pdfStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ProjectClientLog projectId={id} />

      <ProjectPermits projectId={id} />

      <ProjectBylaws projectId={id} />

      <ProjectDrawings projectId={id} />

      <ProjectApprovals projectId={id} />

      {hrEnabled && <ProjectTeam projectId={id} />}

      <ProjectEngagements projectId={id} />

      <Modal
        open={open}
        modalHeading="New fee proposal"
        primaryButtonText={createFee.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!cost || !fee || (below && !override) || createFee.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          createFee.mutate({
            projectId: id,
            workCategory: category as (typeof CoaWorkCategory)[keyof typeof CoaWorkCategory],
            costOfWorksPaise: costPaise,
            feePaise,
            docCommPct: Number(docComm || "0"),
            overrideReason: override || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="f-cat"
            labelText="Work category (COA scale)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.values(CoaWorkCategory).map((c) => (
              <SelectItem key={c} value={c} text={`${c} (${COA_MIN_FEE_PCT[c]}%)`} />
            ))}
          </Select>
          <TextInput
            id="f-cost"
            labelText="Cost of works — construction, excl. land (₹)"
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <TextInput
            id="f-fee"
            labelText="Quoted professional fee (₹)"
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <TextInput
            id="f-dc"
            labelText="Documentation & Communication (%)"
            type="number"
            value={docComm}
            onChange={(e) => setDocComm(e.target.value)}
          />
          {coaMin > 0 && (
            <div style={{ fontSize: "0.875rem" }}>
              COA minimum: <strong>{formatINR(coaMin, { paise: false })}</strong> · Quoted at{" "}
              <strong>{ratioPct}%</strong> of COA minimum · D&amp;C{" "}
              {formatINR(docCommPaise, { paise: false })}
            </div>
          )}
          {below && (
            <>
              <InlineNotification
                kind="warning"
                title="Below COA minimum"
                subtitle="An override reason is required to quote below the COA scale."
                hideCloseButton
                lowContrast
              />
              <TextInput
                id="f-override"
                labelText="Override reason (required)"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            </>
          )}
          {createFee.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={createFee.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>

      <Modal
        open={invOpen}
        modalHeading="New invoice (GST / TDS)"
        primaryButtonText={createInvoice.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!invTaxableR || createInvoice.isPending}
        onRequestClose={() => setInvOpen(false)}
        onRequestSubmit={() =>
          createInvoice.mutate({
            projectId: id,
            phaseId: invPhase || undefined,
            gstSystem: invSys,
            taxablePaise: invTaxablePaise,
            interState: invInter,
            tdsApplicable: invTdsOn,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="iv-phase"
            labelText="Phase (optional)"
            value={invPhase}
            onChange={(e) => setInvPhase(e.target.value)}
          >
            <SelectItem value="" text="— none —" />
            {(phasesQ.data ?? []).map((ph) => (
              <SelectItem key={ph.id} value={ph.id} text={ph.label} />
            ))}
          </Select>
          <Select
            id="iv-sys"
            labelText="GST system"
            value={invSystem}
            onChange={(e) => setInvSystem(e.target.value)}
          >
            {Object.values(GstSystem).map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <TextInput
            id="iv-tax"
            labelText="Taxable value (₹)"
            type="number"
            value={invTaxableR}
            onChange={(e) => setInvTaxableR(e.target.value)}
          />
          <Checkbox
            id="iv-inter"
            labelText="Inter-state (IGST)"
            checked={invInter}
            onChange={(_, { checked }) => setInvInter(checked)}
          />
          <Checkbox
            id="iv-tds"
            labelText="TDS u/s 194J (10%)"
            checked={invTdsOn}
            onChange={(_, { checked }) => setInvTdsOn(checked)}
          />
          {invTaxablePaise > 0 && (
            <div style={{ fontSize: "0.875rem" }}>
              {invBreakup.documentKind} · GST {formatINR(invBreakup.gstTotal, { paise: false })}
              {invBreakup.igst > 0 ? " (IGST)" : invBreakup.gstTotal > 0 ? " (CGST+SGST)" : ""}
              {invBreakup.compositionLevy > 0
                ? ` · Composition levy ${formatINR(invBreakup.compositionLevy, { paise: false })}`
                : ""}{" "}
              · TDS {formatINR(invTdsPaise, { paise: false })} · Net receivable{" "}
              <strong>{formatINR(invNet, { paise: false })}</strong>
            </div>
          )}
          {createInvoice.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={createInvoice.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
