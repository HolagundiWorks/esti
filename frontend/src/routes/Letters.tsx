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
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

function LetterPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.letters.byId.useQuery(
    { id },
    {
      enabled: initial !== "NONE",
      refetchInterval: (query) =>
        query.state.data &&
        (query.state.data.pdfStatus === "PENDING" ||
          query.state.data.pdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );
  const gen = trpc.letters.generatePdf.useMutation({
    onSuccess: () => utils.letters.byId.invalidate({ id }),
  });
  const status = q.data?.pdfStatus ?? initial;
  const url = q.data?.pdfUrl ?? null;
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
    <Button
      kind="ghost"
      size="sm"
      disabled={gen.isPending}
      onClick={() => gen.mutate({ id })}
    >
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

export function Letters() {
  const utils = trpc.useUtils();
  const listQ = trpc.letters.list.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const templatesQ = trpc.documents.listTemplates.useQuery({ kind: "LETTER" });
  const inv = () => utils.letters.list.invalidate();

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    projectId: "",
    recipient: "",
    subject: "",
    body: "",
    dateLetter: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.letters.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
      setF({
        projectId: "",
        recipient: "",
        subject: "",
        body: "",
        dateLetter: "",
      });
    },
  });
  const remove = trpc.letters.remove.useMutation({ onSuccess: inv });

  return (
    <Stack gap={6}>
      <PageHeader
        title="Letters"
        description="Office correspondence on firm letterhead."
        actions={
          <Stack orientation="horizontal" gap={3}>
            <Link to="/office/documents">
              <Button kind="ghost" size="sm">Document register</Button>
            </Link>
            <Button onClick={() => setOpen(true)}>New letter</Button>
          </Stack>
        }
      />

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={5}
        empty={{
          title: "No letters yet",
          description: "Draft a letter and export it as a branded PDF.",
          action: (
            <Button size="sm" onClick={() => setOpen(true)}>
              New letter
            </Button>
          ),
        }}
      >
        <TableContainer title="Letters">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Recipient</TableHeader>
                <TableHeader>Subject</TableHeader>
                <TableHeader>Document</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.ref}</TableCell>
                  <TableCell>{l.recipient}</TableCell>
                  <TableCell>{l.subject}</TableCell>
                  <TableCell>
                    <LetterPdf id={l.id} initial={l.pdfStatus} />
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setConfirmId(l.id)}
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
        heading="Delete letter?"
        body="This permanently removes the letter."
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
        modalHeading="New letter"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !f.recipient || !f.subject || !f.body || create.isPending
        }
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId: f.projectId || undefined,
            recipient: f.recipient,
            subject: f.subject,
            body: f.body,
            dateLetter: f.dateLetter || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="l-tpl"
            labelText="Start from template (optional)"
            value=""
            onChange={(e) => {
              const t = (templatesQ.data ?? []).find((x) => x.id === e.target.value);
              if (t) setF((x) => ({ ...x, subject: t.title, body: t.body }));
            }}
          >
            <SelectItem value="" text="— blank letter —" />
            {(templatesQ.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.title} />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={4}>
            <TextInput
              id="l-to"
              labelText="Recipient"
              value={f.recipient}
              onChange={set("recipient")}
            />
            <TextInput
              id="l-date"
              labelText="Date"
              type="date"
              value={f.dateLetter}
              onChange={set("dateLetter")}
            />
          </Stack>
          <Select
            id="l-proj"
            labelText="Related project (optional)"
            value={f.projectId}
            onChange={set("projectId")}
          >
            <SelectItem value="" text="— none —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                text={`${p.ref} — ${p.title}`}
              />
            ))}
          </Select>
          <TextInput
            id="l-subj"
            labelText="Subject"
            value={f.subject}
            onChange={set("subject")}
          />
          <TextArea
            id="l-body"
            labelText="Body"
            rows={10}
            value={f.body}
            onChange={set("body")}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
