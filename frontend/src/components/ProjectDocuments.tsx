import {
  Button,
  FileUploaderButton,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";

/** Generic PDF action cell: generate via worker, poll, then open. */
function pdfPollOpts(initial: string) {
  return {
    refetchInterval: (q: { state: { data?: { pdfStatus?: string } | null } }) =>
      q.state.data && (q.state.data.pdfStatus === "PENDING" || q.state.data.pdfStatus === "PROCESSING")
        ? 1500
        : (false as const),
    enabled: initial !== "NONE",
  };
}

function InspectionPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.inspections.byId.useQuery({ id }, pdfPollOpts(initial));
  const gen = trpc.inspections.generatePdf.useMutation({ onSuccess: () => utils.inspections.byId.invalidate({ id }) });
  return <PdfButton status={q.data?.pdfStatus ?? initial} url={q.data?.pdfUrl ?? null} pending={gen.isPending} onGen={() => gen.mutate({ id })} />;
}
function SpecPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.spec.byId.useQuery({ id }, pdfPollOpts(initial));
  const gen = trpc.spec.generatePdf.useMutation({ onSuccess: () => utils.spec.byId.invalidate({ id }) });
  return <PdfButton status={q.data?.pdfStatus ?? initial} url={q.data?.pdfUrl ?? null} pending={gen.isPending} onGen={() => gen.mutate({ id })} />;
}
function PdfButton({ status, url, pending, onGen }: { status: string; url: string | null; pending: boolean; onGen: () => void }) {
  if (status === "READY" && url)
    return <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">Open PDF</Button>;
  if (status === "PENDING" || status === "PROCESSING")
    return <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Generating…</span>;
  return <Button kind="ghost" size="sm" disabled={pending} onClick={onGen}>{status === "FAILED" ? "Retry PDF" : "Generate PDF"}</Button>;
}

export function ProjectDocuments({ projectId }: { projectId: string }) {
  return (
    <Stack gap={7} style={{ marginTop: 16 }}>
      <Inspections projectId={projectId} />
      <SpecSheets projectId={projectId} />
      <MoodBoards projectId={projectId} />
    </Stack>
  );
}

// --- Site inspections -------------------------------------------------------
function Inspections({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.inspections.listByProject.useQuery({ projectId });
  const inv = () => utils.inspections.listByProject.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ dateVisit: "", weather: "", attendees: "", progress: "", observations: "", instructions: "", inspectorName: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.inspections.create.useMutation({ onSuccess: () => { inv(); setOpen(false); } });
  const remove = trpc.inspections.remove.useMutation({ onSuccess: inv });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Site inspection reports</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>New report</Button>
      </div>
      <DataState loading={listQ.isLoading} isEmpty={(listQ.data ?? []).length === 0} columnCount={4}
        empty={{ title: "No inspection reports", description: "Record a site visit with observations and instructions." }}>
        <TableContainer title="Inspection reports">
          <Table>
            <TableHead><TableRow><TableHeader>Ref</TableHeader><TableHeader>Date</TableHeader><TableHeader>Inspector</TableHeader><TableHeader>Document</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
            <TableBody>
              {(listQ.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.ref}</TableCell>
                  <TableCell>{s.dateVisit ?? "—"}</TableCell>
                  <TableCell>{s.inspectorName ?? "—"}</TableCell>
                  <TableCell><InspectionPdf id={s.id} initial={s.pdfStatus} /></TableCell>
                  <TableCell><Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(s.id)}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
      <ConfirmModal open={!!confirmId} heading="Delete report?" body="This permanently removes the inspection report." confirmText="Delete"
        pending={remove.isPending} onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }} onClose={() => setConfirmId(null)} />
      <Modal open={open} modalHeading="New site inspection report" primaryButtonText={create.isPending ? "Creating…" : "Create"} secondaryButtonText="Cancel"
        primaryButtonDisabled={create.isPending} size="lg" onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({ projectId, dateVisit: f.dateVisit || undefined, weather: f.weather || undefined, attendees: f.attendees || undefined, progress: f.progress || undefined, observations: f.observations || undefined, instructions: f.instructions || undefined, inspectorName: f.inspectorName || undefined })}>
        <Stack gap={5}>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="si-date" labelText="Date of visit" type="date" value={f.dateVisit} onChange={set("dateVisit")} />
            <TextInput id="si-weather" labelText="Weather" value={f.weather} onChange={set("weather")} />
            <TextInput id="si-by" labelText="Inspected by" value={f.inspectorName} onChange={set("inspectorName")} />
          </div>
          <TextInput id="si-att" labelText="Attendees" value={f.attendees} onChange={set("attendees")} />
          <TextArea id="si-prog" labelText="Progress of work" rows={2} value={f.progress} onChange={set("progress")} />
          <TextArea id="si-obs" labelText="Observations" rows={3} value={f.observations} onChange={set("observations")} />
          <TextArea id="si-ins" labelText="Instructions issued" rows={3} value={f.instructions} onChange={set("instructions")} />
        </Stack>
      </Modal>
    </div>
  );
}

// --- Spec sheets ------------------------------------------------------------
type Row = { category: string; item: string; make: string; specification: string; finish: string; remarks: string };
const blankRow = (): Row => ({ category: "", item: "", make: "", specification: "", finish: "", remarks: "" });

function SpecSheets({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.spec.listByProject.useQuery({ projectId });
  const inv = () => utils.spec.listByProject.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.spec.create.useMutation({ onSuccess: () => { inv(); setOpen(false); setTitle(""); setRows([blankRow()]); } });
  const remove = trpc.spec.remove.useMutation({ onSuccess: inv });
  const setCell = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Specification sheets</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>New spec sheet</Button>
      </div>
      <DataState loading={listQ.isLoading} isEmpty={(listQ.data ?? []).length === 0} columnCount={3}
        empty={{ title: "No specification sheets", description: "Capture materials, makes and finishes by category." }}>
        <TableContainer title="Specification sheets">
          <Table>
            <TableHead><TableRow><TableHeader>Ref</TableHeader><TableHeader>Title</TableHeader><TableHeader>Document</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
            <TableBody>
              {(listQ.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.ref}</TableCell>
                  <TableCell>{s.title}</TableCell>
                  <TableCell><SpecPdf id={s.id} initial={s.pdfStatus} /></TableCell>
                  <TableCell><Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(s.id)}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
      <ConfirmModal open={!!confirmId} heading="Delete spec sheet?" body="This permanently removes the specification sheet." confirmText="Delete"
        pending={remove.isPending} onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }} onClose={() => setConfirmId(null)} />
      <Modal open={open} modalHeading="New specification sheet" primaryButtonText={create.isPending ? "Creating…" : "Create"} secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || !rows.some((r) => r.item.trim()) || create.isPending} size="lg" onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({ projectId, title, items: rows.filter((r) => r.item.trim()).map((r) => ({ category: r.category || undefined, item: r.item, make: r.make || undefined, specification: r.specification || undefined, finish: r.finish || undefined, remarks: r.remarks || undefined })) })}>
        <Stack gap={5}>
          <TextInput id="ss-title" labelText="Sheet title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Table size="sm">
            <TableHead><TableRow><TableHeader>Category</TableHeader><TableHeader>Item</TableHeader><TableHeader>Make</TableHeader><TableHeader>Specification</TableHeader><TableHeader>Finish</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {(["category", "item", "make", "specification", "finish"] as (keyof Row)[]).map((k) => (
                    <TableCell key={k}><TextInput id={`s-${k}-${i}`} labelText="" hideLabel size="sm" value={r[k]} onChange={(e) => setCell(i, k, e.target.value)} /></TableCell>
                  ))}
                  <TableCell><Button kind="ghost" size="sm" hasIconOnly iconDescription="Remove row" renderIcon={TrashCan} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setRows((rs) => [...rs, blankRow()])}>Add row</Button>
        </Stack>
      </Modal>
    </div>
  );
}

// --- Mood boards ------------------------------------------------------------
function MoodBoards({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const boardsQ = trpc.spec.listBoards.useQuery({ projectId });
  const inv = () => utils.spec.listBoards.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.spec.createBoard.useMutation({ onSuccess: () => { inv(); setOpen(false); setTitle(""); } });
  const removeBoard = trpc.spec.removeBoard.useMutation({ onSuccess: inv });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Mood boards</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>New mood board</Button>
      </div>
      <DataState loading={boardsQ.isLoading} isEmpty={(boardsQ.data ?? []).length === 0} columnCount={1}
        empty={{ title: "No mood boards", description: "Create a board and upload reference images." }}>
        <Stack gap={5}>
          {(boardsQ.data ?? []).map((b) => (
            <MoodBoardCard key={b.id} board={b} onDelete={() => setConfirmId(b.id)} />
          ))}
        </Stack>
      </DataState>
      <ConfirmModal open={!!confirmId} heading="Delete mood board?" body="This removes the board and all its images." confirmText="Delete"
        pending={removeBoard.isPending} onConfirm={() => { if (confirmId) removeBoard.mutate({ id: confirmId }); setConfirmId(null); }} onClose={() => setConfirmId(null)} />
      <Modal open={open} modalHeading="New mood board" primaryButtonText={create.isPending ? "Creating…" : "Create"} secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || create.isPending} onRequestClose={() => setOpen(false)} onRequestSubmit={() => create.mutate({ projectId, title })}>
        <TextInput id="mb-title" labelText="Board title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Modal>
    </div>
  );
}

function MoodBoardCard({ board, onDelete }: { board: { id: string; title: string }; onDelete: () => void }) {
  const utils = trpc.useUtils();
  const imgsQ = trpc.spec.boardImages.useQuery({ boardId: board.id });
  const removeImage = trpc.spec.removeImage.useMutation({ onSuccess: () => utils.spec.boardImages.invalidate({ boardId: board.id }) });
  const [busy, setBusy] = useState(false);

  async function uploadImage(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("boardId", board.id);
      fd.append("file", file);
      const res = await fetch("/upload/mood-image", { method: "POST", body: fd, credentials: "include" });
      if (res.ok) utils.spec.boardImages.invalidate({ boardId: board.id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableContainer title={board.title}>
      <div style={{ padding: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
        <FileUploaderButton labelText={busy ? "Uploading…" : "Add image"} accept={[".png", ".jpg", ".jpeg", ".webp"]} disableLabelChanges buttonKind="tertiary"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
        <Button kind="danger--ghost" size="sm" onClick={onDelete}>Delete board</Button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {(imgsQ.data ?? []).length === 0 && <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>No images yet.</span>}
        {(imgsQ.data ?? []).map((im) => (
          <div key={im.id} style={{ width: 160 }}>
            {im.url && <img src={im.url} alt={im.caption ?? ""} style={{ width: 160, height: 120, objectFit: "cover", border: "1px solid var(--cds-border-subtle)" }} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{im.caption ?? ""}</span>
              <Button kind="ghost" size="sm" hasIconOnly iconDescription="Remove image" renderIcon={TrashCan} onClick={() => removeImage.mutate({ id: im.id })} />
            </div>
          </div>
        ))}
      </div>
    </TableContainer>
  );
}
