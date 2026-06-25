import {
  Button,
  InlineNotification,
  Modal,
  MultiSelect,
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
import { Add } from "@carbon/icons-react";
import {
  COST_HEAD_LABEL,
  WORK_PACKAGE_STATUS_LABEL,
  formatINR,
  type WorkPackageStatus,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<WorkPackageStatus, "gray" | "blue" | "teal" | "green" | "cool-gray"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  AWARDED: "teal",
  ACTIVE: "green",
  CLOSED: "cool-gray",
};

const COST_HEAD_OPTIONS = Object.entries(COST_HEAD_LABEL).map(([id, label]) => ({ id, label }));

/** Per-item ledger table for one opened work package (approved → billed → balance). */
function PackageItems({ workPackageId }: { workPackageId: string }) {
  const summaryQ = trpc.workPackages.billedSummary.useQuery({ workPackageId });
  if (summaryQ.isLoading) return <p className="esti-label esti-label--secondary">Loading items…</p>;
  const rows = summaryQ.data ?? [];
  if (rows.length === 0) {
    return <p className="esti-label esti-label--secondary">No lines in this package yet.</p>;
  }
  return (
    <TableContainer title="Package items" description="Approved scope vs. quantity billed to date">
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Description</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>Approved</TableHeader>
            <TableHeader>Variation</TableHeader>
            <TableHeader>Billed</TableHeader>
            <TableHeader>Balance</TableHeader>
            <TableHeader>Rate</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.description}</TableCell>
              <TableCell>{r.unit}</TableCell>
              <TableCell>{r.approvedQty}</TableCell>
              <TableCell>{r.variationQty || "—"}</TableCell>
              <TableCell>{r.billedQty}</TableCell>
              <TableCell>
                <Tag size="sm" type={r.balanceQty <= 0 ? "green" : "outline"}>
                  {r.balanceQty}
                </Tag>
              </TableCell>
              <TableCell>{formatINR(r.ratePaise)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function WorkPackages({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.workPackages.listByProject.useQuery({ projectId });
  const estimatesQ = trpc.estimates.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const contractorsQ = trpc.contractors.list.useQuery({ activeOnly: true });

  const frozenEstimates = (estimatesQ.data ?? []).filter(
    (e) => e.status === "DESIGN_FROZEN" || e.status === "EXECUTION_FROZEN",
  );

  const invalidate = () => utils.workPackages.listByProject.invalidate({ projectId });
  const createFromEstimate = trpc.workPackages.createFromEstimate.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      resetForm();
    },
  });
  const assignContractor = trpc.workPackages.assignContractor.useMutation({ onSuccess: invalidate });
  const setStatus = trpc.workPackages.setStatus.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [estimateId, setEstimateId] = useState("");
  const [name, setName] = useState("");
  const [packageType, setPackageType] = useState("CIVIL");
  const [contractorId, setContractorId] = useState("");
  const [notes, setNotes] = useState("");
  const [heads, setHeads] = useState<string[]>([]);

  const versionsQ = trpc.estimation.versions.useQuery(
    { estimateId },
    { enabled: !!estimateId },
  );
  const frozenVersions = (versionsQ.data ?? []).filter(
    (v) => v.status === "DESIGN_FROZEN" || v.status === "EXECUTION_FROZEN",
  );
  const [versionId, setVersionId] = useState("");

  function resetForm() {
    setEstimateId("");
    setVersionId("");
    setName("");
    setPackageType("CIVIL");
    setContractorId("");
    setNotes("");
    setHeads([]);
  }

  const canCreate = !!versionId && name.trim().length >= 2;

  return (
    <div>
      <Stack
        orientation="horizontal"
        gap={4}
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h3>Work packages</h3>
          <p className="esti-label esti-label--secondary">
            Group frozen BOQ lines into contractor packages. Running bills measure against these —
            nothing can be billed beyond the approved balance.
          </p>
        </div>
        <Button
          size="sm"
          renderIcon={Add}
          disabled={frozenEstimates.length === 0}
          onClick={() => setOpen(true)}
        >
          New package from estimate
        </Button>
      </Stack>

      {frozenEstimates.length === 0 && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Freeze an estimate first"
          subtitle="A work package is carved from a frozen estimate version. Freeze a design or execution estimate to enable packages."
          style={{ marginTop: 12 }}
        />
      )}

      <div style={{ marginTop: 16 }}>
        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={6}
          empty={{
            title: "No work packages",
            description: "Create a package from a frozen estimate to begin contractor billing.",
          }}
        >
          <TableContainer title="Contractor work packages">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Ref</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Contractor</TableHeader>
                  <TableHeader>Contract value</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(listQ.data ?? []).map((pkg) => {
                  const status = pkg.status as WorkPackageStatus;
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>{pkg.ref}</TableCell>
                      <TableCell>{pkg.name}</TableCell>
                      <TableCell>{pkg.packageType}</TableCell>
                      <TableCell>
                        <Select
                          id={`wp-contractor-${pkg.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          value={pkg.contractorId ?? ""}
                          onChange={(e) =>
                            assignContractor.mutate({
                              id: pkg.id,
                              contractorId: e.target.value || null,
                            })
                          }
                        >
                          <SelectItem value="" text="Unassigned" />
                          {(contractorsQ.data ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id} text={c.name} />
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>{formatINR(pkg.contractValuePaise, { paise: false })}</TableCell>
                      <TableCell>
                        <Select
                          id={`wp-status-${pkg.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          value={status}
                          onChange={(e) =>
                            setStatus.mutate({ id: pkg.id, status: e.target.value as WorkPackageStatus })
                          }
                        >
                          {Object.entries(WORK_PACKAGE_STATUS_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value} text={label} />
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => setOpenId(openId === pkg.id ? null : pkg.id)}
                        >
                          {openId === pkg.id ? "Hide" : "Open"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      </div>

      {openId && (
        <div style={{ marginTop: 16 }}>
          {(() => {
            const pkg = (listQ.data ?? []).find((p) => p.id === openId);
            return pkg ? (
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
                  <h4 style={{ marginRight: "auto" }}>
                    {pkg.ref} · {pkg.name}
                  </h4>
                  <Tag size="sm" type={STATUS_TAG[pkg.status as WorkPackageStatus]}>
                    {WORK_PACKAGE_STATUS_LABEL[pkg.status as WorkPackageStatus]}
                  </Tag>
                </Stack>
                <PackageItems workPackageId={openId} />
              </Stack>
            ) : null;
          })()}
        </div>
      )}

      <Modal
        open={open}
        modalHeading="New work package from frozen estimate"
        primaryButtonText={createFromEstimate.isPending ? "Creating…" : "Create package"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canCreate || createFromEstimate.isPending}
        size="md"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          createFromEstimate.mutate({
            projectId,
            estimateVersionId: versionId,
            name,
            packageType,
            contractorId: contractorId || null,
            notes: notes || undefined,
            costHeads: heads.length > 0 ? (heads as never) : undefined,
          })
        }
      >
        <Stack gap={5}>
          {createFromEstimate.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not create package"
              subtitle={createFromEstimate.error.message}
            />
          )}
          <Select
            id="wp-estimate"
            labelText="Frozen estimate"
            value={estimateId}
            onChange={(e) => {
              setEstimateId(e.target.value);
              setVersionId("");
            }}
          >
            <SelectItem value="" text="Select estimate…" />
            {frozenEstimates.map((e) => (
              <SelectItem key={e.id} value={e.id} text={`${e.ref} — ${e.title}`} />
            ))}
          </Select>
          <Select
            id="wp-version"
            labelText="Frozen version"
            disabled={!estimateId}
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
          >
            <SelectItem value="" text="Select version…" />
            {frozenVersions.map((v) => (
              <SelectItem
                key={v.id}
                value={v.id}
                text={`v${v.versionNo} · ${v.stage} · ${formatINR(v.totalPaise, { paise: false })}`}
              />
            ))}
          </Select>
          <TextInput
            id="wp-name"
            labelText="Package name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Stack orientation="horizontal" gap={4}>
            <TextInput
              id="wp-type"
              labelText="Package type"
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
            />
            <Select
              id="wp-contractor"
              labelText="Contractor (optional)"
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
            >
              <SelectItem value="" text="Assign later" />
              {(contractorsQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id} text={c.name} />
              ))}
            </Select>
          </Stack>
          <MultiSelect
            id="wp-heads"
            titleText="Cost heads (optional)"
            label={heads.length > 0 ? `${heads.length} selected` : "All cost heads"}
            items={COST_HEAD_OPTIONS}
            itemToString={(i) => i?.label ?? ""}
            onChange={({ selectedItems }) => setHeads((selectedItems ?? []).map((s) => s.id))}
          />
          <TextArea
            id="wp-notes"
            labelText="Notes (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </Modal>
    </div>
  );
}
