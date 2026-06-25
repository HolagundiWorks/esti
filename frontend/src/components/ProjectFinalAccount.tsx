import {
  Button,
  Checkbox,
  InlineNotification,
  Modal,
  NumberInput,
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
import { Add, DocumentPdf } from "@carbon/icons-react";
import {
  FINAL_ACCOUNT_STATUS_LABEL,
  type FinalAccountStatus,
  can,
  formatINR,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";

const STATUS_TAG: Record<FinalAccountStatus, "blue" | "green"> = {
  DRAFT: "blue",
  CLOSED: "green",
};

const PDF_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  NONE: "gray",
  PENDING: "blue",
  READY: "green",
  FAILED: "red",
};

const toPaise = (rupees: number | string): number =>
  Math.round((typeof rupees === "number" ? rupees : parseFloat(String(rupees)) || 0) * 100);

/** A label + paise amount line in the reconciliation summary. */
function MoneyRow({
  label,
  paise,
  sign,
  strong,
}: {
  label: string;
  paise: number;
  sign?: "+" | "−" | "=";
  strong?: boolean;
}) {
  const text = formatINR(paise, { paise: false });
  return (
    <TableRow>
      <TableCell>{sign ? `${sign} ` : ""}{strong ? <strong>{label}</strong> : label}</TableCell>
      <TableCell>{strong ? <strong>{text}</strong> : text}</TableCell>
    </TableRow>
  );
}

/** Reconciliation statement + closure checklist for one final account. */
function FinalAccountDetail({ id, projectId }: { id: string; projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const canApprove = can(user?.role, "cost:approve");
  const utils = trpc.useUtils();

  const detailQ = trpc.finalAccount.byId.useQuery({ id });

  const refresh = () => {
    void utils.finalAccount.byId.invalidate({ id });
    void utils.finalAccount.listByProject.invalidate({ projectId });
    void utils.workPackages.listByProject.invalidate({ projectId });
  };

  const update = trpc.finalAccount.update.useMutation({ onSuccess: refresh });
  const close = trpc.finalAccount.close.useMutation({ onSuccess: refresh });
  const genPdf = trpc.finalAccount.generatePdf.useMutation({ onSuccess: refresh });

  // Editable closing adjustments (rupees in the inputs, paise on the wire).
  const [finalCertified, setFinalCertified] = useState(0);
  const [retentionReleased, setRetentionReleased] = useState(0);
  const [notes, setNotes] = useState("");

  const fa = detailQ.data;
  useEffect(() => {
    if (fa) {
      setFinalCertified(fa.finalCertifiedPaise / 100);
      setRetentionReleased(fa.retentionReleasedPaise / 100);
      setNotes(fa.notes ?? "");
    }
  }, [fa?.id, fa?.finalCertifiedPaise, fa?.retentionReleasedPaise, fa?.notes]);

  if (detailQ.isLoading || !fa) {
    return <DataState loading isEmpty={false} empty={{ title: "" }} columnCount={2}>{null}</DataState>;
  }

  const closed = fa.status === "CLOSED";
  const editable = canWrite && !closed;
  const f = fa.financials;
  const adjustedContractPaise = f.originalContractPaise + f.variationPaise;
  const blockers = fa.checklist.filter((c) => c.blocking && !c.ok);
  const dirty =
    toPaise(finalCertified) !== fa.finalCertifiedPaise ||
    toPaise(retentionReleased) !== fa.retentionReleasedPaise ||
    notes !== (fa.notes ?? "");

  const setAttestation = (field: "noClaimReceived" | "clientFinalApproval", checked: boolean) =>
    update.mutate({ id, [field]: checked });

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center", flexWrap: "wrap" }}>
        <Tag type={STATUS_TAG[fa.status as FinalAccountStatus]} size="sm">
          {FINAL_ACCOUNT_STATUS_LABEL[fa.status as FinalAccountStatus]}
        </Tag>
        <span className="esti-label--secondary">
          {fa.ref} · {fa.title}
        </span>
        <Tag type={PDF_TAG[fa.pdfStatus] ?? "gray"} size="sm">
          PDF: {fa.pdfStatus}
        </Tag>
      </Stack>

      <TableContainer
        title="Reconciliation statement"
        description="Contract value rolls up from the work-package items; billed totals and recoveries from its running bills."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Head</TableHeader>
              <TableHeader>Amount</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <MoneyRow label="Original contract value" paise={f.originalContractPaise} />
            <MoneyRow label="Approved variations / extra items" paise={f.variationPaise} sign="+" />
            <MoneyRow label="Adjusted contract value" paise={adjustedContractPaise} sign="=" strong />
            <MoneyRow label="Gross billed (all RA bills)" paise={f.grossBilledPaise} />
            <MoneyRow label="Retention held" paise={f.retentionHeldPaise} sign="−" />
            <MoneyRow label="Advances recovered" paise={f.advanceRecoveredPaise} sign="−" />
            <MoneyRow label="TDS deducted" paise={f.taxTdsPaise} sign="−" />
            <MoneyRow label="Other recoveries" paise={f.otherRecoveryPaise} sign="−" />
            <MoneyRow label="Net paid to date" paise={f.netPaidPaise} sign="=" strong />
          </TableBody>
        </Table>
      </TableContainer>

      <Stack gap={4}>
        <h5>Closing adjustments</h5>
        <Stack orientation="horizontal" gap={5} style={{ flexWrap: "wrap" }}>
          <NumberInput
            id={`fa-final-certified-${id}`}
            label="Final certified amount (₹)"
            min={0}
            step={1}
            value={finalCertified}
            disabled={!editable}
            onChange={(_e, { value }) => setFinalCertified(typeof value === "number" ? value : parseFloat(String(value)) || 0)}
          />
          <NumberInput
            id={`fa-retention-released-${id}`}
            label="Retention released (₹)"
            min={0}
            step={1}
            value={retentionReleased}
            disabled={!editable}
            onChange={(_e, { value }) => setRetentionReleased(typeof value === "number" ? value : parseFloat(String(value)) || 0)}
          />
        </Stack>
        <TableContainer title="" description="">
          <Table>
            <TableBody>
              <MoneyRow label="Final certified" paise={toPaise(finalCertified)} strong />
              <MoneyRow label="Net paid to date" paise={f.netPaidPaise} sign="−" />
              <MoneyRow
                label="Balance due to contractor"
                paise={toPaise(finalCertified) - f.netPaidPaise}
                sign="="
                strong
              />
            </TableBody>
          </Table>
        </TableContainer>
        <TextArea
          id={`fa-notes-${id}`}
          labelText="Notes"
          rows={2}
          value={notes}
          disabled={!editable}
          onChange={(e) => setNotes(e.target.value)}
        />
        {editable && (
          <Stack orientation="horizontal" gap={3}>
            <Button
              kind="tertiary"
              size="sm"
              disabled={!dirty || update.isPending}
              onClick={() =>
                update.mutate({
                  id,
                  finalCertifiedPaise: toPaise(finalCertified),
                  retentionReleasedPaise: toPaise(retentionReleased),
                  notes,
                })
              }
            >
              Save adjustments
            </Button>
          </Stack>
        )}
      </Stack>

      <Stack gap={4}>
        <h5>Closure checklist</h5>
        <TableContainer
          title=""
          description="Rule 6 — a final account cannot close while deviations or variations remain open."
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Check</TableHeader>
                <TableHeader>Required</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {fa.checklist.map((c) => {
                const attestable =
                  (c.key === "no_claim_cert" || c.key === "client_final_approval") && editable;
                const field = c.key === "no_claim_cert" ? "noClaimReceived" : "clientFinalApproval";
                return (
                  <TableRow key={c.key}>
                    <TableCell>{c.label}</TableCell>
                    <TableCell>
                      <Tag type={c.blocking ? "red" : "gray"} size="sm">
                        {c.blocking ? "Blocking" : "Advisory"}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      {attestable ? (
                        <Checkbox
                          id={`fa-attest-${c.key}-${id}`}
                          labelText="Received"
                          checked={c.ok}
                          disabled={update.isPending}
                          onChange={(_e, { checked }) => setAttestation(field, checked)}
                        />
                      ) : (
                        <Tag type={c.ok ? "green" : "red"} size="sm">
                          {c.ok ? "OK" : "Not yet"}
                        </Tag>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {!closed && blockers.length > 0 && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Cannot close yet"
            subtitle={`Unresolved: ${blockers.map((b) => b.label).join("; ")}.`}
          />
        )}
      </Stack>

      <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
        {!closed && canApprove && (
          <Button
            size="sm"
            disabled={!fa.canClose || close.isPending}
            onClick={() => close.mutate({ id })}
          >
            Close final account
          </Button>
        )}
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={DocumentPdf}
          disabled={genPdf.isPending}
          onClick={() => genPdf.mutate({ id, projectId })}
        >
          {fa.pdfStatus === "PENDING" ? "Generating…" : "Generate PDF"}
        </Button>
      </Stack>
    </Stack>
  );
}

/** Final account list + closure workspace (Construction Cost OS Phase F). */
export function ProjectFinalAccount({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const utils = trpc.useUtils();

  const listQ = trpc.finalAccount.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const wpQ = trpc.workPackages.listByProject.useQuery({ projectId }, { enabled: !!projectId });

  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ title: "", workPackageId: "" });

  const create = trpc.finalAccount.create.useMutation({
    onSuccess: (row) => {
      void utils.finalAccount.listByProject.invalidate({ projectId });
      setNewOpen(false);
      setForm({ title: "", workPackageId: "" });
      setOpenId(row.id);
    },
  });

  const rows = listQ.data ?? [];
  const wps = wpQ.data ?? [];
  const wpById = new Map(wps.map((wp) => [wp.id, wp]));

  return (
    <Stack gap={5}>
      <Stack
        orientation="horizontal"
        gap={3}
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Stack gap={1}>
          <h4>Final account</h4>
          <p className="esti-label--secondary">
            Reconcile one work package — certified versus paid — then close it. Closure is blocked
            while any deviation or variation is still open (Rule 6).
          </p>
        </Stack>
        {canWrite && (
          <Button size="sm" renderIcon={Add} onClick={() => setNewOpen(true)}>
            New final account
          </Button>
        )}
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{
          title: "No final accounts yet",
          description:
            "Open a final account against a work package to reconcile its certified value with what's been paid and formally close the contract.",
        }}
      >
        <TableContainer title="Final accounts">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Work package</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Final certified</TableHeader>
                <TableHeader>Balance due</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const wp = r.workPackageId ? wpById.get(r.workPackageId) : undefined;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.ref}</TableCell>
                    <TableCell>
                      {wp ? (
                        <Tag type="cool-gray" size="sm">
                          {wp.ref ?? "WP"}
                        </Tag>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[r.status as FinalAccountStatus]} size="sm">
                        {FINAL_ACCOUNT_STATUS_LABEL[r.status as FinalAccountStatus]}
                      </Tag>
                    </TableCell>
                    <TableCell>{formatINR(r.finalCertifiedPaise, { paise: false })}</TableCell>
                    <TableCell>{formatINR(r.balanceDuePaise, { paise: false })}</TableCell>
                    <TableCell>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      >
                        {openId === r.id ? "Hide" : "Open"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {openId && <FinalAccountDetail id={openId} projectId={projectId} />}

      <Modal
        open={newOpen}
        modalHeading="New final account"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.title || !form.workPackageId || create.isPending}
        onRequestClose={() => setNewOpen(false)}
        onRequestSubmit={() => {
          if (!form.title || !form.workPackageId) return;
          create.mutate({ projectId, title: form.title, workPackageId: form.workPackageId });
        }}
      >
        <Stack gap={5}>
          <TextInput
            id="fa-title"
            labelText="Title"
            placeholder="e.g. Tower A — civil works final account"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          />
          <Select
            id="fa-wp"
            labelText="Work package"
            value={form.workPackageId}
            onChange={(e) => setForm((s) => ({ ...s, workPackageId: e.target.value }))}
          >
            <SelectItem value="" text="Select a work package…" />
            {wps.map((wp) => (
              <SelectItem key={wp.id} value={wp.id} text={`${wp.ref ?? "WP"} · ${wp.name}`} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </Stack>
  );
}
