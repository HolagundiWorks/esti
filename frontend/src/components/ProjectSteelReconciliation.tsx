import {
  Button,
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
import { Add } from "@carbon/icons-react";
import {
  BAR_DIAS,
  STEEL_RECON_STATUS_LABEL,
  STEEL_WASTAGE_SEVERITY_LABEL,
  type SteelReconStatus,
  type SteelWastageSeverity,
  can,
  steelReconLineVariance,
  steelReconTotals,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";

const STATUS_TAG: Record<string, "blue" | "green"> = {
  DRAFT: "blue",
  FINALIZED: "green",
};

const SEVERITY_TAG: Record<SteelWastageSeverity, "green" | "purple" | "red"> = {
  WITHIN_LIMIT: "green",
  WARNING: "purple",
  EXCEEDED: "red",
};

const toNum = (value: number | string): number =>
  typeof value === "number" ? value : parseFloat(String(value)) || 0;

function SeverityTag({ severity }: { severity: SteelWastageSeverity }) {
  return (
    <Tag type={SEVERITY_TAG[severity]} size="sm">
      {STEEL_WASTAGE_SEVERITY_LABEL[severity]}
    </Tag>
  );
}

/** Per-diameter reconciliation worksheet for one DRAFT/FINALIZED record. */
function ReconciliationDetail({
  reconciliationId,
  projectId,
}: {
  reconciliationId: string;
  projectId: string;
}) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const canApprove = can(user?.role, "cost:approve");
  const utils = trpc.useUtils();

  const detailQ = trpc.steelReconciliation.byId.useQuery({ id: reconciliationId });
  const bbsQ = trpc.bbs.listByProject.useQuery({ projectId });

  const refresh = () => {
    void utils.steelReconciliation.byId.invalidate({ id: reconciliationId });
    void utils.steelReconciliation.listByProject.invalidate({ projectId });
  };

  const seed = trpc.steelReconciliation.seedFromBbs.useMutation({ onSuccess: refresh });
  const addLine = trpc.steelReconciliation.addLine.useMutation({ onSuccess: refresh });
  const updateLine = trpc.steelReconciliation.updateLine.useMutation({ onSuccess: refresh });
  const removeLine = trpc.steelReconciliation.removeLine.useMutation({ onSuccess: refresh });
  const finalize = trpc.steelReconciliation.finalize.useMutation({ onSuccess: refresh });

  const [seedOpen, setSeedOpen] = useState(false);
  const [seedBbsId, setSeedBbsId] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [lineForm, setLineForm] = useState({ diaMm: "12", scheduledKg: 0, issuedKg: 0, consumedKg: 0 });
  const [drafts, setDrafts] = useState<Record<string, { issuedKg: number; consumedKg: number }>>({});

  if (detailQ.isLoading || !detailQ.data) {
    return <DataState loading isEmpty={false} empty={{ title: "" }} columnCount={6}>{null}</DataState>;
  }

  const recon = detailQ.data;
  const lines = recon.lines;
  const totals = steelReconTotals(lines);
  const totalsVariance = steelReconLineVariance(totals);
  const finalized = recon.status === "FINALIZED";
  const editable = canWrite && !finalized;
  const bbsOptions = bbsQ.data ?? [];
  const exceeded = lines.some(
    (l) => steelReconLineVariance(l).severity === "EXCEEDED",
  );

  const draftFor = (line: { id: string; issuedKg: number; consumedKg: number }) =>
    drafts[line.id] ?? { issuedKg: line.issuedKg, consumedKg: line.consumedKg };

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center", flexWrap: "wrap" }}>
        <Tag type={STATUS_TAG[recon.status]} size="sm">
          {STEEL_RECON_STATUS_LABEL[recon.status as SteelReconStatus]}
        </Tag>
        <span className="esti-label--secondary">
          {recon.ref} · scheduled {totals.scheduledKg} kg · issued {totals.issuedKg} kg · consumed{" "}
          {totals.consumedKg} kg · wastage {totals.wastageKg} kg
        </span>
      </Stack>

      {exceeded && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Steel wastage over the site allowance"
          subtitle="One or more diameters exceed the ~5% cutting/lap allowance. Review before finalizing."
        />
      )}

      <TableContainer
        title="Per-diameter reconciliation"
        description="Wastage = issued − consumed. Scheduled is seeded from the linked BBS."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Dia (mm)</TableHeader>
              <TableHeader>Scheduled (kg)</TableHeader>
              <TableHeader>Issued (kg)</TableHeader>
              <TableHeader>Consumed (kg)</TableHeader>
              <TableHeader>Wastage (kg)</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => {
              const d = draftFor(line);
              const variance = steelReconLineVariance({
                scheduledKg: line.scheduledKg,
                issuedKg: d.issuedKg,
                consumedKg: d.consumedKg,
              });
              const dirty =
                d.issuedKg !== line.issuedKg || d.consumedKg !== line.consumedKg;
              return (
                <TableRow key={line.id}>
                  <TableCell>Ø{line.diaMm}</TableCell>
                  <TableCell>{line.scheduledKg}</TableCell>
                  <TableCell>
                    {editable ? (
                      <NumberInput
                        id={`issued-${line.id}`}
                        size="sm"
                        hideLabel
                        label="Issued"
                        min={0}
                        step={1}
                        value={d.issuedKg}
                        onChange={(_e, { value }) =>
                          setDrafts((p) => ({
                            ...p,
                            [line.id]: { ...draftFor(line), issuedKg: toNum(value) },
                          }))
                        }
                      />
                    ) : (
                      line.issuedKg
                    )}
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <NumberInput
                        id={`consumed-${line.id}`}
                        size="sm"
                        hideLabel
                        label="Consumed"
                        min={0}
                        step={1}
                        value={d.consumedKg}
                        onChange={(_e, { value }) =>
                          setDrafts((p) => ({
                            ...p,
                            [line.id]: { ...draftFor(line), consumedKg: toNum(value) },
                          }))
                        }
                      />
                    ) : (
                      line.consumedKg
                    )}
                  </TableCell>
                  <TableCell>{variance.wastageKg}</TableCell>
                  <TableCell>
                    <SeverityTag severity={variance.severity} />
                  </TableCell>
                  <TableCell>
                    {editable && (
                      <Stack orientation="horizontal" gap={2}>
                        <Button
                          kind="ghost"
                          size="sm"
                          disabled={!dirty || updateLine.isPending}
                          onClick={() =>
                            updateLine.mutate({
                              id: line.id,
                              reconciliationId,
                              issuedKg: d.issuedKg,
                              consumedKg: d.consumedKg,
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          disabled={removeLine.isPending}
                          onClick={() => removeLine.mutate({ id: line.id, reconciliationId })}
                        >
                          Remove
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {lines.length > 0 && (
              <TableRow>
                <TableCell>
                  <strong>Total</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.scheduledKg}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.issuedKg}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.consumedKg}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.wastageKg}</strong>
                </TableCell>
                <TableCell>
                  <SeverityTag severity={totalsVariance.severity} />
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {lines.length === 0 && (
        <p className="esti-label--secondary">
          No diameters yet — seed the scheduled steel from a BBS, or add a diameter manually.
        </p>
      )}

      {editable && (
        <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
          <Button
            kind="tertiary"
            size="sm"
            disabled={bbsOptions.length === 0}
            onClick={() => {
              setSeedBbsId(recon.bbsId ?? bbsOptions[0]?.id ?? "");
              setSeedOpen(true);
            }}
          >
            Seed from BBS
          </Button>
          <Button kind="tertiary" size="sm" renderIcon={Add} onClick={() => setLineOpen(true)}>
            Add diameter
          </Button>
          {canApprove && (
            <Button
              size="sm"
              disabled={lines.length === 0 || finalize.isPending}
              onClick={() => finalize.mutate({ id: reconciliationId })}
            >
              Finalize
            </Button>
          )}
        </Stack>
      )}

      <Modal
        open={seedOpen}
        modalHeading="Seed scheduled steel from a BBS"
        primaryButtonText={seed.isPending ? "Seeding…" : "Seed"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!seedBbsId || seed.isPending}
        onRequestClose={() => setSeedOpen(false)}
        onRequestSubmit={() => {
          if (!seedBbsId) return;
          seed.mutate({ reconciliationId, bbsId: seedBbsId }, { onSuccess: () => setSeedOpen(false) });
        }}
      >
        <Stack gap={4}>
          <p className="esti-label--secondary">
            Each bar diameter's scheduled weight is read from the schedule. Issued and consumed
            values you've already entered are kept.
          </p>
          <Select
            id="seed-bbs"
            labelText="Bar bending schedule"
            value={seedBbsId}
            onChange={(e) => setSeedBbsId(e.target.value)}
          >
            <SelectItem value="" text="Select a schedule…" />
            {bbsOptions.map((b) => (
              <SelectItem key={b.id} value={b.id} text={`${b.ref ?? "BBS"} · ${b.title}`} />
            ))}
          </Select>
        </Stack>
      </Modal>

      <Modal
        open={lineOpen}
        modalHeading="Add diameter"
        primaryButtonText={addLine.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={addLine.isPending}
        onRequestClose={() => setLineOpen(false)}
        onRequestSubmit={() =>
          addLine.mutate(
            {
              reconciliationId,
              diaMm: Number(lineForm.diaMm),
              scheduledKg: lineForm.scheduledKg,
              issuedKg: lineForm.issuedKg,
              consumedKg: lineForm.consumedKg,
            },
            { onSuccess: () => setLineOpen(false) },
          )
        }
      >
        <Stack gap={5}>
          <Select
            id="line-dia"
            labelText="Diameter (mm)"
            value={lineForm.diaMm}
            onChange={(e) => setLineForm((f) => ({ ...f, diaMm: e.target.value }))}
          >
            {BAR_DIAS.map((d) => (
              <SelectItem key={d} value={String(d)} text={`${d}`} />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={4}>
            <NumberInput
              id="line-scheduled"
              label="Scheduled (kg)"
              min={0}
              step={1}
              value={lineForm.scheduledKg}
              onChange={(_e, { value }) => setLineForm((f) => ({ ...f, scheduledKg: toNum(value) }))}
            />
            <NumberInput
              id="line-issued"
              label="Issued (kg)"
              min={0}
              step={1}
              value={lineForm.issuedKg}
              onChange={(_e, { value }) => setLineForm((f) => ({ ...f, issuedKg: toNum(value) }))}
            />
            <NumberInput
              id="line-consumed"
              label="Consumed (kg)"
              min={0}
              step={1}
              value={lineForm.consumedKg}
              onChange={(_e, { value }) => setLineForm((f) => ({ ...f, consumedKg: toNum(value) }))}
            />
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}

/** Steel reconciliation list + worksheet (Construction Cost OS Phase E). */
export function ProjectSteelReconciliation({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const utils = trpc.useUtils();

  const listQ = trpc.steelReconciliation.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const wpQ = trpc.workPackages.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const bbsQ = trpc.bbs.listByProject.useQuery({ projectId }, { enabled: !!projectId });

  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ title: "", workPackageId: "", bbsId: "", notes: "" });

  const create = trpc.steelReconciliation.create.useMutation({
    onSuccess: (row) => {
      void utils.steelReconciliation.listByProject.invalidate({ projectId });
      setNewOpen(false);
      setForm({ title: "", workPackageId: "", bbsId: "", notes: "" });
      setOpenId(row.id);
    },
  });

  const rows = listQ.data ?? [];
  const wps = wpQ.data ?? [];
  const bbsOptions = bbsQ.data ?? [];

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Stack gap={1}>
          <h4>Steel reconciliation</h4>
          <p className="esti-label--secondary">
            Scheduled vs issued vs consumed steel, per diameter — finalize is a wastage sign-off.
          </p>
        </Stack>
        {canWrite && (
          <Button size="sm" renderIcon={Add} onClick={() => setNewOpen(true)}>
            New reconciliation
          </Button>
        )}
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{
          title: "No steel reconciliations yet",
          description:
            "Reconcile a work package's steel: seed the scheduled weight from its BBS, then enter issued and consumed.",
        }}
      >
        <TableContainer title="Reconciliations">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Issued (kg)</TableHeader>
                <TableHeader>Wastage (kg)</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.ref}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[r.status]} size="sm">
                      {STEEL_RECON_STATUS_LABEL[r.status as "DRAFT" | "FINALIZED"]}
                    </Tag>
                  </TableCell>
                  <TableCell>{r.issuedKg}</TableCell>
                  <TableCell>{r.wastageKg}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {openId && <ReconciliationDetail reconciliationId={openId} projectId={projectId} />}

      <Modal
        open={newOpen}
        modalHeading="New steel reconciliation"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.title || create.isPending}
        onRequestClose={() => setNewOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            title: form.title,
            workPackageId: form.workPackageId || undefined,
            bbsId: form.bbsId || undefined,
            notes: form.notes || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="recon-title"
            labelText="Title"
            placeholder="e.g. Tower A — RCC steel reconciliation"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            id="recon-wp"
            labelText="Work package (optional)"
            value={form.workPackageId}
            onChange={(e) => setForm((f) => ({ ...f, workPackageId: e.target.value }))}
          >
            <SelectItem value="" text="Not linked" />
            {wps.map((wp) => (
              <SelectItem key={wp.id} value={wp.id} text={`${wp.ref ?? "WP"} · ${wp.name}`} />
            ))}
          </Select>
          <Select
            id="recon-bbs"
            labelText="Bar bending schedule (optional)"
            value={form.bbsId}
            onChange={(e) => setForm((f) => ({ ...f, bbsId: e.target.value }))}
          >
            <SelectItem value="" text="Not linked" />
            {bbsOptions.map((b) => (
              <SelectItem key={b.id} value={b.id} text={`${b.ref ?? "BBS"} · ${b.title}`} />
            ))}
          </Select>
          <TextArea
            id="recon-notes"
            labelText="Notes (optional)"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
