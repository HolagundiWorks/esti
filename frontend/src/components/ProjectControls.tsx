import {
  Button,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  RadioButton,
  RadioButtonGroup,
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  Toggle,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  DEVIATION_SEVERITY_LABEL,
  DEVIATION_STATUS_LABEL,
  DEVIATION_TYPE_LABEL,
  REASON_SOURCE_LABEL,
  VARIATION_ORIGINATOR_LABEL,
  VARIATION_STATUS_LABEL,
  type DeviationSeverity,
  type DeviationStatus,
  type VariationStatus,
  can,
  deviationSeverity,
  formatINR,
  quantityDeviation,
  rateDeviation,
  variationItemAmountPaise,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";
import { ProjectRateLadder } from "./ProjectRateLadder.js";

const DEVIATION_STATUS_TAG: Record<DeviationStatus, "blue" | "green" | "red"> = {
  OPEN: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

const SEVERITY_TAG: Record<DeviationSeverity, "green" | "purple" | "red"> = {
  WITHIN_LIMIT: "green",
  WARNING: "purple",
  APPROVAL_REQUIRED: "red",
};

const VARIATION_STATUS_TAG: Record<
  VariationStatus,
  "gray" | "blue" | "cyan" | "purple" | "green" | "cool-gray" | "red"
> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  INTERNAL_APPROVED: "cyan",
  CLIENT_APPROVED: "purple",
  APPLIED: "green",
  CLOSED: "cool-gray",
  REJECTED: "red",
};

/** ₹ text → integer paise. */
function toPaise(rupees: string): number {
  return Math.round(Number(rupees || "0") * 100);
}

/**
 * Construction Cost OS Phase D — Controls. Deviations make scope/rate drift
 * against the contract visible and governed (document + approve only; a rate
 * deviation never overwrites the contract rate — Rule 5). Variation orders are
 * the only thing that mutates the billable ledger, and only after a two-step
 * internal + client sign-off. Lives in the costing "Controls" tab.
 */
export function ProjectControls({ projectId }: { projectId: string }) {
  return (
    <div>
      <Stack gap={2}>
        <h3>Controls</h3>
        <p className="esti-label--secondary">
          Govern contract drift. Deviations document and approve quantity / rate changes against
          the contract; variation orders are the only thing that changes the billable ledger, after
          an internal then client sign-off.
        </p>
      </Stack>
      <Tabs>
        <TabList aria-label="Controls" contained>
          <Tab>Deviations</Tab>
          <Tab>Variation orders</Tab>
          <Tab>Rate ladder</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DeviationsPanel projectId={projectId} />
          </TabPanel>
          <TabPanel>
            <VariationsPanel projectId={projectId} />
          </TabPanel>
          <TabPanel>
            <ProjectRateLadder projectId={projectId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

// --- Deviations --------------------------------------------------------------

function DeviationsPanel({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const canApprove = can(user?.role, "cost:approve");
  const utils = trpc.useUtils();

  const packagesQ = trpc.workPackages.listByProject.useQuery({ projectId });
  const [workPackageId, setWorkPackageId] = useState("");
  const summaryQ = trpc.workPackages.billedSummary.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const listQ = trpc.deviations.listByWorkPackage.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const items = summaryQ.data ?? [];

  const invalidate = () => {
    void utils.deviations.listByWorkPackage.invalidate({ workPackageId });
  };
  const create = trpc.deviations.create.useMutation({ onSuccess: invalidate });
  const approve = trpc.deviations.approve.useMutation({ onSuccess: invalidate });
  const reject = trpc.deviations.reject.useMutation({ onSuccess: invalidate });
  const convert = trpc.deviations.convertToVariation.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"QTY" | "RATE">("QTY");
  const [workPackageItemId, setWorkPackageItemId] = useState("");
  const [executedQty, setExecutedQty] = useState("");
  const [revisedRate, setRevisedRate] = useState("");
  const [reason, setReason] = useState("");
  const [reasonSource, setReasonSource] = useState("OTHER");

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const selected = items.find((i) => i.id === workPackageItemId);
  const boqQty = selected ? selected.approvedQty + selected.variationQty : 0;
  const awardedRatePaise = selected?.ratePaise ?? 0;

  // Live deviation + severity for the form.
  let livePct = 0;
  if (selected && type === "QTY" && executedQty !== "") {
    livePct = quantityDeviation({ boqQty, executedQty: Number(executedQty) }).deviationPct;
  } else if (selected && type === "RATE" && revisedRate !== "") {
    livePct = rateDeviation({ awardedRatePaise, revisedRatePaise: toPaise(revisedRate) }).deviationPct;
  }
  const liveSeverity = deviationSeverity(livePct);

  const canCreate =
    !!workPackageItemId &&
    reason.trim().length >= 2 &&
    (type === "QTY" ? executedQty !== "" : revisedRate !== "");

  const resetForm = () => {
    setType("QTY");
    setWorkPackageItemId("");
    setExecutedQty("");
    setRevisedRate("");
    setReason("");
    setReasonSource("OTHER");
  };

  return (
    <div>
      <Stack
        orientation="horizontal"
        gap={4}
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <p className="esti-label--secondary">
          A deviation records a quantity or rate change against a work-package BOQ line. Approving a
          rate deviation never overwrites the contract rate — push it to bills with a variation.
        </p>
        {canWrite && (
          <Button size="sm" renderIcon={Add} disabled={!workPackageId} onClick={() => setOpen(true)}>
            New deviation
          </Button>
        )}
      </Stack>

      <Stack gap={5} style={{ marginTop: "var(--cds-spacing-05)" }}>
        <Select
          id="dev-package"
          labelText="Work package"
          value={workPackageId}
          onChange={(e) => {
            setWorkPackageId(e.target.value);
            resetForm();
          }}
        >
          <SelectItem value="" text="Select a work package" />
          {(packagesQ.data ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.name}`} />
          ))}
        </Select>

        {workPackageId && (
          <DataState
            loading={listQ.isLoading}
            isEmpty={(listQ.data ?? []).length === 0}
            columnCount={7}
            empty={{
              title: "No deviations yet",
              description: "Record a quantity or rate deviation against a BOQ line to begin.",
            }}
          >
            <TableContainer title="Deviations">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>BOQ line</TableHeader>
                    <TableHeader>Deviation</TableHeader>
                    <TableHeader>Cost impact</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(listQ.data ?? []).map((d) => {
                    const status = d.status as DeviationStatus;
                    const sev = deviationSeverity(d.deviationPct);
                    const dev =
                      d.deviationType === "QTY"
                        ? `${d.deviationPct}% · ${d.deviationQty} ${d.unit}`
                        : `${d.deviationPct}% · ${formatINR(d.revisedRatePaise - d.awardedRatePaise)}/${d.unit}`;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>{d.ref}</TableCell>
                        <TableCell>
                          <Tag size="sm" type={d.deviationType === "QTY" ? "blue" : "teal"}>
                            {DEVIATION_TYPE_LABEL[d.deviationType as "QTY" | "RATE"]}
                          </Tag>
                        </TableCell>
                        <TableCell>{d.description}</TableCell>
                        <TableCell>
                          <Stack gap={1}>
                            <span>{dev}</span>
                            <Tag size="sm" type={SEVERITY_TAG[sev]}>
                              {DEVIATION_SEVERITY_LABEL[sev]}
                            </Tag>
                          </Stack>
                        </TableCell>
                        <TableCell>{formatINR(d.costImpactPaise)}</TableCell>
                        <TableCell>
                          <Tag size="sm" type={DEVIATION_STATUS_TAG[status]}>
                            {DEVIATION_STATUS_LABEL[status]}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          <Stack orientation="horizontal" gap={2}>
                            {status === "OPEN" && canApprove && (
                              <>
                                <Button
                                  size="sm"
                                  kind="tertiary"
                                  disabled={approve.isPending}
                                  onClick={() => approve.mutate({ id: d.id, projectId })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  kind="danger--tertiary"
                                  onClick={() => {
                                    setRejectId(d.id);
                                    setRejectReason("");
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {status !== "REJECTED" && !d.variationId && canWrite && (
                              <Button
                                size="sm"
                                kind="ghost"
                                disabled={convert.isPending}
                                onClick={() => convert.mutate({ id: d.id, projectId })}
                              >
                                To variation
                              </Button>
                            )}
                            {d.variationId && (
                              <Tag size="sm" type="purple">
                                In variation
                              </Tag>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        )}
      </Stack>

      <Modal
        open={open}
        modalHeading="New deviation"
        primaryButtonText={create.isPending ? "Recording..." : "Record deviation"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canCreate || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          create.mutate(
            {
              projectId,
              workPackageId,
              workPackageItemId,
              type,
              executedQty: type === "QTY" ? Number(executedQty) : undefined,
              revisedRatePaise: type === "RATE" ? toPaise(revisedRate) : undefined,
              reason: reason.trim(),
              reasonSource: reasonSource as never,
            },
            {
              onSuccess: () => {
                setOpen(false);
                resetForm();
              },
            },
          );
        }}
      >
        <Stack gap={5}>
          {create.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not record deviation"
              subtitle={create.error.message}
            />
          )}
          <RadioButtonGroup
            legendText="Deviation type"
            name="dev-type"
            valueSelected={type}
            onChange={(v) => setType(v as "QTY" | "RATE")}
          >
            <RadioButton labelText="Quantity" value="QTY" id="dev-type-qty" />
            <RadioButton labelText="Rate" value="RATE" id="dev-type-rate" />
          </RadioButtonGroup>
          <Select
            id="dev-item"
            labelText="BOQ line"
            value={workPackageItemId}
            onChange={(e) => setWorkPackageItemId(e.target.value)}
          >
            <SelectItem value="" text="Select a BOQ line" />
            {items.map((i) => (
              <SelectItem
                key={i.id}
                value={i.id}
                text={`${i.description} — ${boqLineSummary(i)}`}
              />
            ))}
          </Select>
          {type === "QTY" ? (
            <TextInput
              id="dev-executed"
              labelText="Executed quantity"
              type="number"
              value={executedQty}
              helperText={
                selected ? `Contract qty ${boqQty} ${selected.unit} @ ${formatINR(awardedRatePaise)}/${selected.unit}` : ""
              }
              onChange={(e) => setExecutedQty(e.target.value)}
            />
          ) : (
            <TextInput
              id="dev-revised-rate"
              labelText="Revised rate (₹)"
              type="number"
              value={revisedRate}
              helperText={
                selected ? `Awarded contract rate ${formatINR(awardedRatePaise)}/${selected.unit} (never overwritten)` : ""
              }
              onChange={(e) => setRevisedRate(e.target.value)}
            />
          )}
          {selected && livePct !== 0 && liveSeverity !== "WITHIN_LIMIT" && (
            <InlineNotification
              kind={liveSeverity === "APPROVAL_REQUIRED" ? "warning" : "info"}
              lowContrast
              hideCloseButton
              title={DEVIATION_SEVERITY_LABEL[liveSeverity]}
              subtitle={`This is a ${livePct}% deviation against the contract.`}
            />
          )}
          <Select
            id="dev-reason-source"
            labelText="Reason source"
            value={reasonSource}
            onChange={(e) => setReasonSource(e.target.value)}
          >
            {Object.entries(REASON_SOURCE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} text={v} />
            ))}
          </Select>
          <TextArea
            id="dev-reason"
            labelText="Reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </Modal>

      <Modal
        open={rejectId !== null}
        danger
        modalHeading="Reject deviation"
        primaryButtonText={reject.isPending ? "Rejecting..." : "Reject"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={rejectReason.trim().length < 2 || reject.isPending}
        onRequestClose={() => setRejectId(null)}
        onRequestSubmit={() => {
          if (!rejectId) return;
          reject.mutate(
            { id: rejectId, projectId, reason: rejectReason.trim() },
            { onSuccess: () => setRejectId(null) },
          );
        }}
      >
        <TextInput
          id="dev-reject-reason"
          labelText="Reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}

function boqLineSummary(i: { approvedQty: number; variationQty: number; unit: string }) {
  return `contract ${i.approvedQty + i.variationQty} ${i.unit}`;
}

// --- Variation orders --------------------------------------------------------

function VariationsPanel({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const canApprove = can(user?.role, "cost:approve");
  const utils = trpc.useUtils();

  const packagesQ = trpc.workPackages.listByProject.useQuery({ projectId });
  const listQ = trpc.variations.listByProject.useQuery({ projectId });

  const invalidate = () => void utils.variations.listByProject.invalidate({ projectId });
  const create = trpc.variations.create.useMutation({ onSuccess: invalidate });
  const submit = trpc.variations.submit.useMutation({ onSuccess: invalidate });
  const approveInternal = trpc.variations.approveInternal.useMutation({ onSuccess: invalidate });
  const approveClient = trpc.variations.approveClient.useMutation({ onSuccess: invalidate });
  const applyToLedger = trpc.variations.applyToLedger.useMutation({ onSuccess: invalidate });
  const reject = trpc.variations.reject.useMutation({ onSuccess: invalidate });
  const close = trpc.variations.close.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [workPackageId, setWorkPackageId] = useState("");
  const [originator, setOriginator] = useState("CLIENT");
  const [reason, setReason] = useState("");
  const [billable, setBillable] = useState(true);
  const [timeImpactDays, setTimeImpactDays] = useState("0");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");

  const resetForm = () => {
    setTitle("");
    setWorkPackageId("");
    setOriginator("CLIENT");
    setReason("");
    setBillable(true);
    setTimeImpactDays("0");
  };

  return (
    <div>
      <Stack
        orientation="horizontal"
        gap={4}
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <p className="esti-label--secondary">
          A variation carries lines that add quantity to a contract line or introduce extra scope.
          It must clear an internal then a client approval before Apply writes it to the ledger.
        </p>
        {canWrite && (
          <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
            New variation
          </Button>
        )}
      </Stack>

      <Stack gap={5} style={{ marginTop: "var(--cds-spacing-05)" }}>
        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={7}
          empty={{
            title: "No variation orders yet",
            description: "Create a variation to add scope or push an approved deviation to bills.",
          }}
        >
          <TableContainer title="Variation orders">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Ref</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Originator</TableHeader>
                  <TableHeader>Cost impact</TableHeader>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(listQ.data ?? []).map((v) => {
                  const status = v.status as VariationStatus;
                  return (
                    <TableRow key={v.id}>
                      <TableCell>{v.ref}</TableCell>
                      <TableCell>{v.title}</TableCell>
                      <TableCell>
                        <Tag size="sm" type="cool-gray">
                          {VARIATION_ORIGINATOR_LABEL[v.originator as keyof typeof VARIATION_ORIGINATOR_LABEL]}
                        </Tag>
                      </TableCell>
                      <TableCell>{formatINR(v.costImpactPaise)}</TableCell>
                      <TableCell>{v.timeImpactDays ? `${v.timeImpactDays} d` : "—"}</TableCell>
                      <TableCell>
                        <Tag size="sm" type={VARIATION_STATUS_TAG[status]}>
                          {VARIATION_STATUS_LABEL[status]}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <OverflowMenu aria-label="Variation actions" size="sm" flipped>
                          <OverflowMenuItem itemText="Open" onClick={() => setDetailId(v.id)} />
                          {status === "DRAFT" && canWrite && (
                            <OverflowMenuItem
                              itemText="Submit"
                              onClick={() => submit.mutate({ id: v.id, projectId })}
                            />
                          )}
                          {status === "SUBMITTED" && canApprove && (
                            <OverflowMenuItem
                              itemText="Internal approve"
                              onClick={() => approveInternal.mutate({ id: v.id, projectId })}
                            />
                          )}
                          {status === "INTERNAL_APPROVED" && canApprove && (
                            <OverflowMenuItem
                              itemText="Client approve"
                              onClick={() => {
                                setClientId(v.id);
                                setClientName("");
                              }}
                            />
                          )}
                          {status === "CLIENT_APPROVED" && canApprove && (
                            <OverflowMenuItem
                              itemText="Apply to ledger"
                              onClick={() => applyToLedger.mutate({ id: v.id, projectId })}
                            />
                          )}
                          {status === "APPLIED" && canWrite && (
                            <OverflowMenuItem
                              itemText="Close"
                              onClick={() => close.mutate({ id: v.id, projectId })}
                            />
                          )}
                          {status !== "APPLIED" &&
                            status !== "CLOSED" &&
                            status !== "REJECTED" &&
                            canApprove && (
                              <OverflowMenuItem
                                isDelete
                                itemText="Reject"
                                onClick={() => {
                                  setRejectId(v.id);
                                  setRejectReason("");
                                }}
                              />
                            )}
                        </OverflowMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      </Stack>

      <Modal
        open={open}
        modalHeading="New variation order"
        primaryButtonText={create.isPending ? "Creating..." : "Create variation"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={title.trim().length < 2 || !workPackageId || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          create.mutate(
            {
              projectId,
              workPackageId,
              title: title.trim(),
              reason: reason.trim() || undefined,
              originator: originator as never,
              timeImpactDays: Number(timeImpactDays || "0"),
              billable,
            },
            {
              onSuccess: (v) => {
                setOpen(false);
                resetForm();
                setDetailId(v.id);
              },
            },
          );
        }}
      >
        <Stack gap={5}>
          {create.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not create variation"
              subtitle={create.error.message}
            />
          )}
          <TextInput id="vo-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select
            id="vo-package"
            labelText="Work package"
            value={workPackageId}
            onChange={(e) => setWorkPackageId(e.target.value)}
          >
            <SelectItem value="" text="Select a work package" />
            {(packagesQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.name}`} />
            ))}
          </Select>
          <Select
            id="vo-originator"
            labelText="Originator"
            value={originator}
            onChange={(e) => setOriginator(e.target.value)}
          >
            {Object.entries(VARIATION_ORIGINATOR_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} text={v} />
            ))}
          </Select>
          <TextInput
            id="vo-time"
            labelText="Time impact (days)"
            type="number"
            value={timeImpactDays}
            onChange={(e) => setTimeImpactDays(e.target.value)}
          />
          <Toggle
            id="vo-billable"
            labelText="Billable"
            labelA="No"
            labelB="Yes"
            toggled={billable}
            onToggle={(checked) => setBillable(checked)}
          />
          <TextArea
            id="vo-reason"
            labelText="Reason / scope"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </Modal>

      {detailId && (
        <VariationDetail
          variationId={detailId}
          projectId={projectId}
          canWrite={canWrite}
          onClose={() => setDetailId(null)}
        />
      )}

      <Modal
        open={clientId !== null}
        modalHeading="Client approval"
        primaryButtonText={approveClient.isPending ? "Approving..." : "Record client approval"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={approveClient.isPending}
        onRequestClose={() => setClientId(null)}
        onRequestSubmit={() => {
          if (!clientId) return;
          approveClient.mutate(
            { id: clientId, projectId, clientApprovedByName: clientName.trim() || undefined },
            { onSuccess: () => setClientId(null) },
          );
        }}
      >
        <TextInput
          id="vo-client-name"
          labelText="Approved by (client name)"
          helperText="Optional — who at the client signed off."
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
      </Modal>

      <Modal
        open={rejectId !== null}
        danger
        modalHeading="Reject variation"
        primaryButtonText={reject.isPending ? "Rejecting..." : "Reject"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={rejectReason.trim().length < 2 || reject.isPending}
        onRequestClose={() => setRejectId(null)}
        onRequestSubmit={() => {
          if (!rejectId) return;
          reject.mutate(
            { id: rejectId, projectId, reason: rejectReason.trim() },
            { onSuccess: () => setRejectId(null) },
          );
        }}
      >
        <TextInput
          id="vo-reject-reason"
          labelText="Reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}

// --- Variation detail + items editor -----------------------------------------

function VariationDetail({
  variationId,
  projectId,
  canWrite,
  onClose,
}: {
  variationId: string;
  projectId: string;
  canWrite: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const detailQ = trpc.variations.byId.useQuery({ id: variationId });
  const variation = detailQ.data?.variation;
  const items = detailQ.data?.items ?? [];
  const editable = variation?.status === "DRAFT" || variation?.status === "SUBMITTED";

  const summaryQ = trpc.workPackages.billedSummary.useQuery(
    { workPackageId: variation?.workPackageId ?? "" },
    { enabled: !!variation?.workPackageId },
  );
  const wpItems = summaryQ.data ?? [];

  const invalidate = () => void utils.variations.byId.invalidate({ id: variationId });
  const addItem = trpc.variations.addItem.useMutation({ onSuccess: invalidate });
  const removeItem = trpc.variations.removeItem.useMutation({ onSuccess: invalidate });

  const [isExtra, setIsExtra] = useState(false);
  const [workPackageItemId, setWorkPackageItemId] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");

  const existing = wpItems.find((i) => i.id === workPackageItemId);
  // Existing-line additions price at the contract rate (Rule 5); extra items at their own rate.
  const effectiveRatePaise = isExtra ? toPaise(rate) : (existing?.ratePaise ?? 0);
  const liveAmount = variationItemAmountPaise(Number(qty || "0"), effectiveRatePaise);
  const canAdd =
    Number(qty || "0") !== 0 &&
    (isExtra ? description.trim().length >= 1 && unit.trim().length >= 1 : !!workPackageItemId);

  const resetLine = () => {
    setWorkPackageItemId("");
    setDescription("");
    setUnit("");
    setQty("");
    setRate("");
  };

  return (
    <Modal
      open
      passiveModal
      modalHeading={variation ? `${variation.ref} — ${variation.title}` : "Variation"}
      onRequestClose={onClose}
    >
      <Stack gap={6}>
        {variation && (
          <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
            <Tag size="sm" type={VARIATION_STATUS_TAG[variation.status as VariationStatus]}>
              {VARIATION_STATUS_LABEL[variation.status as VariationStatus]}
            </Tag>
            <Tag size="sm" type="cool-gray">
              {VARIATION_ORIGINATOR_LABEL[variation.originator as keyof typeof VARIATION_ORIGINATOR_LABEL]}
            </Tag>
            <Tag size="sm" type={variation.billable ? "green" : "gray"}>
              {variation.billable ? "Billable" : "Non-billable"}
            </Tag>
            <Tag size="sm" type="blue">{`Impact ${formatINR(variation.costImpactPaise)}`}</Tag>
          </Stack>
        )}

        <DataState
          loading={detailQ.isLoading}
          isEmpty={items.length === 0}
          columnCount={5}
          empty={{ title: "No lines yet", description: "Add a contract-line addition or an extra item." }}
        >
          <TableContainer title="Variation lines">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Item</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  {editable && canWrite && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      {it.description}
                      {it.isExtraItem && (
                        <>
                          {" "}
                          <Tag size="sm" type="teal">
                            Extra
                          </Tag>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {it.qty} {it.unit}
                    </TableCell>
                    <TableCell>{formatINR(it.ratePaise)}</TableCell>
                    <TableCell>{formatINR(it.amountPaise)}</TableCell>
                    {editable && canWrite && (
                      <TableCell>
                        <Button
                          size="sm"
                          kind="danger--ghost"
                          disabled={removeItem.isPending}
                          onClick={() => removeItem.mutate({ id: it.id, variationId })}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>

        {editable && canWrite && (
          <Stack gap={4}>
            <h5>Add a line</h5>
            {addItem.error && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Could not add line"
                subtitle={addItem.error.message}
              />
            )}
            <Toggle
              id="vo-line-extra"
              labelText="Extra item (new scope)"
              labelA="No"
              labelB="Yes"
              toggled={isExtra}
              onToggle={(checked) => {
                setIsExtra(checked);
                resetLine();
              }}
            />
            {isExtra ? (
              <Stack orientation="horizontal" gap={4}>
                <TextInput
                  id="vo-line-desc"
                  labelText="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <TextInput id="vo-line-unit" labelText="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </Stack>
            ) : (
              <Select
                id="vo-line-item"
                labelText="Contract line to add to"
                value={workPackageItemId}
                onChange={(e) => setWorkPackageItemId(e.target.value)}
              >
                <SelectItem value="" text="Select a BOQ line" />
                {wpItems.map((i) => (
                  <SelectItem
                    key={i.id}
                    value={i.id}
                    text={`${i.description} — ${formatINR(i.ratePaise)}/${i.unit}`}
                  />
                ))}
              </Select>
            )}
            <Stack orientation="horizontal" gap={4}>
              <TextInput
                id="vo-line-qty"
                labelText="Qty (negative = omission)"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              {isExtra ? (
                <TextInput
                  id="vo-line-rate"
                  labelText="Rate (₹)"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              ) : (
                <TextInput
                  id="vo-line-rate-ro"
                  labelText="Rate (contract)"
                  value={existing ? formatINR(existing.ratePaise) : "—"}
                  readOnly
                />
              )}
            </Stack>
            <Stack orientation="horizontal" gap={4} style={{ alignItems: "center" }}>
              <Tag size="sm" type="blue">{`Line amount ${formatINR(liveAmount)}`}</Tag>
              <Button
                size="sm"
                renderIcon={Add}
                disabled={!canAdd || addItem.isPending}
                onClick={() =>
                  addItem.mutate(
                    {
                      variationId,
                      isExtraItem: isExtra,
                      workPackageItemId: isExtra ? null : workPackageItemId,
                      description: isExtra ? description.trim() : (existing?.description ?? ""),
                      unit: isExtra ? unit.trim() : (existing?.unit ?? ""),
                      qty: Number(qty || "0"),
                      ratePaise: effectiveRatePaise,
                    },
                    { onSuccess: resetLine },
                  )
                }
              >
                Add line
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
