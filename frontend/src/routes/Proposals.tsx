import {
  Button,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import { COA_SCOPE_TEMPLATE, PROJECT_WORK_TYPE_LABEL, ProjectWorkType, formatINR } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

function ProposalPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.proposals.byId.useQuery(
    { id },
    {
      enabled: initial !== "NONE",
      refetchInterval: (query) =>
        query.state.data && (query.state.data.pdfStatus === "PENDING" || query.state.data.pdfStatus === "PROCESSING") ? 1500 : false,
    },
  );
  const gen = trpc.proposals.generatePdf.useMutation({ onSuccess: () => utils.proposals.byId.invalidate({ id }) });
  const status = q.data?.pdfStatus ?? initial;
  const url = q.data?.pdfUrl ?? null;
  if (status === "READY" && url) return <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">Open PDF</Button>;
  if (status === "PENDING" || status === "PROCESSING") return <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Generating…</span>;
  return <Button kind="ghost" size="sm" disabled={gen.isPending} onClick={() => gen.mutate({ id })}>{status === "FAILED" ? "Retry PDF" : "Generate PDF"}</Button>;
}

export function Proposals() {
  const utils = trpc.useUtils();
  const listQ = trpc.proposals.listAll.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const inv = () => utils.proposals.listAll.invalidate();

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [workType, setWorkType] = useState<string>("ARCHITECTURE");
  const [scope, setScope] = useState(COA_SCOPE_TEMPLATE.ARCHITECTURE);
  const [fee, setFee] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.proposals.create.useMutation({ onSuccess: () => { inv(); setOpen(false); setProjectId(""); setFee(""); } });
  const remove = trpc.proposals.remove.useMutation({ onSuccess: inv });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Proposals &amp; agreements</h1>
          <p style={{ color: "var(--cds-text-secondary)" }}>COA-based engagement proposals across all projects.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New proposal</Button>
      </div>

      <DataState loading={listQ.isLoading} isEmpty={(listQ.data ?? []).length === 0} columnCount={6}
        empty={{ title: "No proposals", description: "Draft a COA proposal with scope and fee for a project.", action: <Button size="sm" onClick={() => setOpen(true)}>New proposal</Button> }}>
        <TableContainer title="All proposals">
          <Table>
            <TableHead><TableRow><TableHeader>Ref</TableHeader><TableHeader>Project</TableHeader><TableHeader>Discipline</TableHeader><TableHeader>Fee</TableHeader><TableHeader>Document</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
            <TableBody>
              {(listQ.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.ref}</TableCell>
                  <TableCell><Link to={`/projects/${p.projectId}`}>{p.projectRef}</Link><div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{p.projectTitle}</div></TableCell>
                  <TableCell>{PROJECT_WORK_TYPE_LABEL[p.workType as keyof typeof PROJECT_WORK_TYPE_LABEL] ?? p.workType}</TableCell>
                  <TableCell>{formatINR(p.feePaise, { paise: false })}</TableCell>
                  <TableCell><ProposalPdf id={p.id} initial={p.pdfStatus} /></TableCell>
                  <TableCell><Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(p.id)}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <ConfirmModal open={!!confirmId} heading="Delete proposal?" body="This permanently removes the proposal." confirmText="Delete"
        pending={remove.isPending} onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }} onClose={() => setConfirmId(null)} />

      <Modal open={open} modalHeading="New proposal" primaryButtonText={create.isPending ? "Creating…" : "Create"} secondaryButtonText="Cancel"
        primaryButtonDisabled={!projectId || create.isPending} size="lg" onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({ projectId, workType: workType as (typeof ProjectWorkType.options)[number], scope, feePaise: Math.round(Number(fee || "0") * 100) })}>
        <Stack gap={5}>
          <Select id="pr-proj" labelText="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <SelectItem value="" text="Select a project…" />
            {(projectsQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />)}
          </Select>
          <Select id="pr-work" labelText="Discipline" value={workType} onChange={(e) => { setWorkType(e.target.value); setScope(COA_SCOPE_TEMPLATE[e.target.value as keyof typeof COA_SCOPE_TEMPLATE]); }}>
            {ProjectWorkType.options.map((t) => <SelectItem key={t} value={t} text={PROJECT_WORK_TYPE_LABEL[t]} />)}
          </Select>
          <TextInput id="pr-fee" labelText="Professional fee (₹)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
          <TextArea id="pr-scope" labelText="Scope of work (COA template — edit as needed)" rows={10} value={scope} onChange={(e) => setScope(e.target.value)} />
        </Stack>
      </Modal>
    </div>
  );
}
