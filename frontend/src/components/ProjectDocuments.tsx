import {
  Button,
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
import { Add, TrashCan } from "@carbon/icons-react";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { ProjectMom } from "./ProjectMom.js";
import { ProjectInspectionDetail } from "./ProjectInspectionDetail.js";
import { DocumentReviseButton } from "./DocumentReviseButton.js";

/** Generic PDF action cell: generate via worker, poll, then open. */
function pdfPollOpts(initial: string) {
  return {
    refetchInterval: (q: {
      state: { data?: { pdfStatus?: string } | null };
    }) => pdfPollInterval(q.state.data?.pdfStatus, initial !== "NONE"),
    enabled: initial !== "NONE",
  };
}

function InspectionPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.inspections.byId.useQuery({ id }, pdfPollOpts(initial));
  const gen = trpc.inspections.generatePdf.useMutation({
    onSuccess: () => utils.inspections.byId.invalidate({ id }),
  });
  return (
    <PdfButton
      status={q.data?.pdfStatus ?? initial}
      url={q.data?.pdfUrl ?? null}
      pending={gen.isPending}
      onGen={() => gen.mutate({ id })}
    />
  );
}
function SpecPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.spec.byId.useQuery({ id }, pdfPollOpts(initial));
  const gen = trpc.spec.generatePdf.useMutation({
    onSuccess: () => utils.spec.byId.invalidate({ id }),
  });
  return (
    <PdfButton
      status={q.data?.pdfStatus ?? initial}
      url={q.data?.pdfUrl ?? null}
      pending={gen.isPending}
      onGen={() => gen.mutate({ id })}
    />
  );
}
function PdfButton({
  status,
  url,
  pending,
  onGen,
}: {
  status: string;
  url: string | null;
  pending: boolean;
  onGen: () => void;
}) {
  if (status === "READY" && url)
    return (
      <Button
        kind="ghost"
        size="sm"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        Open PDF
      </Button>
    );
  if (status === "PENDING" || status === "PROCESSING")
    return <span>Generating…</span>;
  return (
    <Button kind="ghost" size="sm" disabled={pending} onClick={onGen}>
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

export function ProjectDocuments({ projectId, includeSpecs = true }: { projectId: string; includeSpecs?: boolean }) {
  return (
    <Stack gap={7} style={{ marginTop: "var(--cds-spacing-05)" }}>
      <Inspections projectId={projectId} />
      <ProjectMom projectId={projectId} />
      {includeSpecs && <ProjectSpecSheets projectId={projectId} />}
      <FinalEstimationRecords projectId={projectId} />
    </Stack>
  );
}

// --- Final estimation records (frozen CMS sets, archived from the BOQ tab) ---
function FinalEstimationRecords({ projectId }: { projectId: string }) {
  const setsQ = trpc.cms.finalSet.listByProject.useQuery({ projectId });
  const sets = setsQ.data ?? [];
  return (
    <div>
      <h3>Final estimation records</h3>
      <DataState
        loading={setsQ.isLoading}
        isEmpty={!setsQ.isLoading && sets.length === 0}
        columnCount={5}
        empty={{
          title: "No final estimation records",
          description: "Freeze an estimate in Cost Management → BOQ to archive a revision here.",
        }}
      >
        <TableContainer title="Final estimation records">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Rev</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Document</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {sets.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>Rev {s.revisionNo}</TableCell>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>
                    <Tag type={s.status === "FINAL" ? "green" : "gray"} size="sm">{s.status}</Tag>
                  </TableCell>
                  <TableCell>{formatINR(s.totalPaise)}</TableCell>
                  <TableCell>
                    {s.pdfStatus === "READY" && s.pdfKey ? (
                      <Button kind="ghost" size="sm" href={`/files/${s.pdfKey}`} target="_blank" rel="noreferrer">
                        Open PDF
                      </Button>
                    ) : s.pdfStatus === "PENDING" || s.pdfStatus === "PROCESSING" ? (
                      <span>Generating…</span>
                    ) : (
                      <Tag type="gray" size="sm">{s.pdfStatus}</Tag>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </div>
  );
}

// --- Site inspections -------------------------------------------------------
function Inspections({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.inspections.listByProject.useQuery({ projectId });
  const inv = () => utils.inspections.listByProject.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    dateVisit: "",
    weather: "",
    attendees: "",
    progress: "",
    observations: "",
    instructions: "",
    inspectorName: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const create = trpc.inspections.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
    },
  });
  const remove = trpc.inspections.remove.useMutation({ onSuccess: inv });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Site inspection reports</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
          New report
        </Button>
      </div>
      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{
          title: "No inspection reports",
          description:
            "Record a site visit with observations and instructions.",
        }}
      >
        <TableContainer title="Inspection reports">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Inspector</TableHeader>
                <TableHeader>Document</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.ref}</TableCell>
                  <TableCell>{s.dateVisit ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={s.status === "ISSUED" || s.pdfStatus === "READY" ? "green" : "gray"} size="sm">
                      {s.status ?? "DRAFT"}
                    </Tag>
                  </TableCell>
                  <TableCell>{s.inspectorName ?? "—"}</TableCell>
                  <TableCell>
                    <InspectionPdf id={s.id} initial={s.pdfStatus} />
                  </TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button kind="ghost" size="sm" onClick={() => setDetailId(s.id)}>Open</Button>
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        onClick={() => setConfirmId(s.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
      <ConfirmModal
        open={!!confirmId}
        heading="Delete report?"
        body="This permanently removes the inspection report."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />
      <ProjectInspectionDetail
        inspectionId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />
      <Modal
        open={open}
        modalHeading="New site inspection report"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={create.isPending}
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            dateVisit: f.dateVisit || undefined,
            weather: f.weather || undefined,
            attendees: f.attendees || undefined,
            progress: f.progress || undefined,
            observations: f.observations || undefined,
            instructions: f.instructions || undefined,
            inspectorName: f.inspectorName || undefined,
          })
        }
      >
        <Stack gap={5}>
          <div style={{ display: "flex", gap: "var(--cds-spacing-04)" }}>
            <TextInput
              id="si-date"
              labelText="Date of visit"
              type="date"
              value={f.dateVisit}
              onChange={set("dateVisit")}
            />
            <TextInput
              id="si-weather"
              labelText="Weather"
              value={f.weather}
              onChange={set("weather")}
            />
            <TextInput
              id="si-by"
              labelText="Inspected by"
              value={f.inspectorName}
              onChange={set("inspectorName")}
            />
          </div>
          <TextInput
            id="si-att"
            labelText="Attendees"
            value={f.attendees}
            onChange={set("attendees")}
          />
          <TextArea
            id="si-prog"
            labelText="Progress of work"
            rows={2}
            value={f.progress}
            onChange={set("progress")}
          />
          <TextArea
            id="si-obs"
            labelText="Observations"
            rows={3}
            value={f.observations}
            onChange={set("observations")}
          />
          <TextArea
            id="si-ins"
            labelText="Instructions issued"
            rows={3}
            value={f.instructions}
            onChange={set("instructions")}
          />
        </Stack>
      </Modal>
    </div>
  );
}

// --- Spec sheets ------------------------------------------------------------
type Row = {
  catalogItemId?: string;
  category: string;
  item: string;
  make: string;
  specification: string;
  finish: string;
  remarks: string;
};
const blankRow = (): Row => ({
  category: "",
  item: "",
  make: "",
  specification: "",
  finish: "",
  remarks: "",
});

function rowFromCatalog(item: {
  id: string;
  category: string | null;
  item: string;
  make: string | null;
  specification: string | null;
  finish: string | null;
  remarks: string | null;
}): Row {
  return {
    catalogItemId: item.id,
    category: item.category ?? "",
    item: item.item,
    make: item.make ?? "",
    specification: item.specification ?? "",
    finish: item.finish ?? "",
    remarks: item.remarks ?? "",
  };
}

export function ProjectSpecSheets({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.spec.listByProject.useQuery({ projectId });
  const catalogQ = trpc.specCatalog.activeCatalog.useQuery();
  const inv = () => utils.spec.listByProject.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [pickId, setPickId] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const catalogItems = catalogQ.data?.items ?? [];
  const hasValidRow = rows.some(
    (r) => r.catalogItemId || r.item.trim().length > 0,
  );
  const create = trpc.spec.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
      setTitle("");
      setRows([blankRow()]);
    },
  });
  const remove = trpc.spec.remove.useMutation({ onSuccess: inv });
  const setCell = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Specification sheets</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
          New spec sheet
        </Button>
      </div>
      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={3}
        empty={{
          title: "No specification sheets",
          description: "Capture materials, makes and finishes by category.",
        }}
      >
        <TableContainer title="Specification sheets">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Ver</TableHeader>
                <TableHeader>Document</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.ref}</TableCell>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>{s.versionNo ?? 1}</TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <SpecPdf id={s.id} initial={s.pdfStatus} />
                      {(s.status === "ISSUED" || s.pdfStatus === "READY") && (
                        <DocumentReviseButton
                          entityType="SPEC_SHEET"
                          entityId={s.id}
                          onDone={inv}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setConfirmId(s.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
      <ConfirmModal
        open={!!confirmId}
        heading="Delete spec sheet?"
        body="This permanently removes the specification sheet."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />
      <Modal
        open={open}
        modalHeading="New specification sheet"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !title || !hasValidRow || create.isPending
        }
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            title,
            items: rows
              .filter((r) => r.catalogItemId || r.item.trim())
              .map((r) => ({
                catalogItemId: r.catalogItemId,
                category: r.category || undefined,
                item: r.item.trim() || undefined,
                make: r.make || undefined,
                specification: r.specification || undefined,
                finish: r.finish || undefined,
                remarks: r.remarks || undefined,
              })),
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="ss-title"
            labelText="Sheet title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {!catalogQ.isLoading && catalogItems.length === 0 && (
            <InlineNotification
              kind="info"
              title="No active specification catalogue"
              subtitle="Add and activate a catalogue version in Knowledge Bank → Specification."
              lowContrast
            />
          )}
          {catalogItems.length > 0 && (
            <Stack orientation="horizontal" gap={4}>
              <Select
                id="ss-catalog-pick"
                labelText="Add from catalogue"
                value={pickId}
                onChange={(e) => setPickId(e.target.value)}
              >
                <SelectItem value="" text="Select catalogue item…" />
                {catalogItems.map((item) => (
                  <SelectItem
                    key={item.id}
                    value={item.id}
                    text={`${item.category ? `${item.category} · ` : ""}${item.item}`}
                  />
                ))}
              </Select>
              <Button
                kind="tertiary"
                disabled={!pickId}
                onClick={() => {
                  const picked = catalogItems.find((item) => item.id === pickId);
                  if (!picked) return;
                  setRows((rs) => [...rs.filter((r) => r.item.trim() || r.catalogItemId), rowFromCatalog(picked)]);
                  setPickId("");
                }}
              >
                Add row
              </Button>
            </Stack>
          )}
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Category</TableHeader>
                <TableHeader>Item</TableHeader>
                <TableHeader>Make</TableHeader>
                <TableHeader>Specification</TableHeader>
                <TableHeader>Finish</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {(
                    [
                      "category",
                      "item",
                      "make",
                      "specification",
                      "finish",
                    ] as (keyof Row)[]
                  ).map((k) => (
                    <TableCell key={k}>
                      <TextInput
                        id={`s-${k}-${i}`}
                        labelText=""
                        hideLabel
                        size="sm"
                        value={r[k]}
                        onChange={(e) => setCell(i, k, e.target.value)}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription="Remove row"
                      renderIcon={TrashCan}
                      disabled={rows.length === 1}
                      onClick={() =>
                        setRows((rs) => rs.filter((_, idx) => idx !== i))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Add}
            onClick={() => setRows((rs) => [...rs, blankRow()])}
          >
            Add row
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
