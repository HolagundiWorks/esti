import {
  Button,
  Checkbox,
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
import {
  TRANSMITTAL_CHANNELS,
  TRANSMITTAL_PURPOSES,
  type TransmittalChannelCode,
  type TransmittalPurposeCode,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

function TransmittalPdfCell({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: string;
}) {
  const utils = trpc.useUtils();
  const [active, setActive] = useState(initialStatus !== "NONE");
  const byId = trpc.transmittals.byId.useQuery(
    { id },
    {
      enabled: active,
      refetchInterval: (q) =>
        q.state.data &&
        (q.state.data.pdfStatus === "PENDING" ||
          q.state.data.pdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );
  const gen = trpc.transmittals.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.transmittals.byId.invalidate({ id });
    },
  });
  const status = byId.data?.pdfStatus ?? initialStatus;
  const url = byId.data?.pdfUrl ?? null;
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
    return <span>Rendering…</span>;
  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={gen.isPending}
      onClick={() => gen.mutate({ id })}
    >
      {status === "FAILED" ? "Retry" : "Generate PDF"}
    </Button>
  );
}

export function ProjectTransmittals({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.transmittals.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const drawingsQ = trpc.drawings.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const ready = (drawingsQ.data ?? []).filter((d) => d.status === "READY");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    recipient: "",
    purpose: "FOR_APPROVAL",
    channel: "EMAIL",
    dateIssued: "",
    notes: "",
  });
  const [picked, setPicked] = useState<Record<string, number>>({}); // drawingId -> copies

  const create = trpc.transmittals.create.useMutation({
    onSuccess: () => {
      utils.transmittals.listByProject.invalidate({ projectId });
      setOpen(false);
      setForm({
        recipient: "",
        purpose: "FOR_APPROVAL",
        channel: "EMAIL",
        dateIssued: "",
        notes: "",
      });
      setPicked({});
    },
  });

  const items = Object.entries(picked).map(([drawingId, copies]) => {
    const d = ready.find((x) => x.id === drawingId)!;
    return { drawingId, drawingRef: d.ref, title: d.title, copies };
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Transmittals</h3>
        <Button
          size="sm"
          disabled={ready.length === 0}
          onClick={() => setOpen(true)}
        >
          New transmittal
        </Button>
      </div>
      {ready.length === 0 && <p>Upload &amp; process drawings first.</p>}
      <TableContainer
        title="Issued transmittals"
        description="Drawing issue records with cover-sheet PDFs"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Recipient</TableHeader>
              <TableHeader>Purpose</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>PDF</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.ref}</TableCell>
                <TableCell>{t.recipient}</TableCell>
                <TableCell>
                  {TRANSMITTAL_PURPOSES[t.purpose as TransmittalPurposeCode] ??
                    t.purpose}
                </TableCell>
                <TableCell>{t.dateIssued ?? "—"}</TableCell>
                <TableCell>
                  <TransmittalPdfCell id={t.id} initialStatus={t.pdfStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="New drawing transmittal"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !form.recipient || items.length === 0 || create.isPending
        }
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            recipient: form.recipient,
            purpose: form.purpose as TransmittalPurposeCode,
            channel: form.channel as TransmittalChannelCode,
            dateIssued: form.dateIssued || null,
            notes: form.notes || undefined,
            items,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="tr-recipient"
            labelText="Recipient"
            value={form.recipient}
            onChange={(e) =>
              setForm((f) => ({ ...f, recipient: e.target.value }))
            }
          />
          <div style={{ display: "flex", gap: 12 }}>
            <Select
              id="tr-purpose"
              labelText="Purpose"
              value={form.purpose}
              onChange={(e) =>
                setForm((f) => ({ ...f, purpose: e.target.value }))
              }
            >
              {(
                Object.keys(TRANSMITTAL_PURPOSES) as TransmittalPurposeCode[]
              ).map((k) => (
                <SelectItem key={k} value={k} text={TRANSMITTAL_PURPOSES[k]} />
              ))}
            </Select>
            <Select
              id="tr-channel"
              labelText="Channel"
              value={form.channel}
              onChange={(e) =>
                setForm((f) => ({ ...f, channel: e.target.value }))
              }
            >
              {(
                Object.keys(TRANSMITTAL_CHANNELS) as TransmittalChannelCode[]
              ).map((k) => (
                <SelectItem key={k} value={k} text={TRANSMITTAL_CHANNELS[k]} />
              ))}
            </Select>
            <TextInput
              id="tr-date"
              labelText="Date issued"
              type="date"
              value={form.dateIssued}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateIssued: e.target.value }))
              }
            />
          </div>

          <div>
            <p style={{ marginBottom: 4 }}>Drawings to include</p>
            {ready.map((d) => {
              const checked = d.id in picked;
              return (
                <div
                  key={d.id}
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <Checkbox
                    id={`tr-d-${d.id}`}
                    labelText={`${d.ref} — ${d.title}`}
                    checked={checked}
                    onChange={(_e, { checked: c }) =>
                      setPicked((p) => {
                        const next = { ...p };
                        if (c) next[d.id] = 1;
                        else delete next[d.id];
                        return next;
                      })
                    }
                  />
                  {checked && (
                    <TextInput
                      id={`tr-c-${d.id}`}
                      labelText="Copy count"
                      hideLabel
                      size="sm"
                      type="number"
                      value={String(picked[d.id])}
                      onChange={(e) =>
                        setPicked((p) => ({
                          ...p,
                          [d.id]: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      style={{ maxWidth: 90 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <TextArea
            id="tr-notes"
            labelText="Notes (optional)"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Stack>
      </Modal>
    </>
  );
}
