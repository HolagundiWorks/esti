import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  TRANSMITTAL_CHANNELS,
  TRANSMITTAL_PURPOSES,
  type TransmittalChannelCode,
  type TransmittalPurposeCode,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { PdfActionButtons } from "./PdfActionButtons.js";

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
      refetchInterval: (q) => pdfPollInterval(q.state.data?.pdfStatus, active),
    },
  );
  const gen = trpc.transmittals.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.transmittals.byId.invalidate({ id });
    },
  });
  return (
    <PdfActionButtons
      status={byId.data?.pdfStatus ?? initialStatus}
      url={byId.data?.pdfUrl ?? null}
      generatePending={gen.isPending}
      onGenerate={() => gen.mutate({ id })}
      share={{ text: "Please find the attached drawing transmittal.", fileName: "transmittal.pdf" }}
    />
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

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    { field: "recipient", headerName: "Recipient", flex: 1.2, minWidth: 140 },
    {
      field: "purpose",
      headerName: "Purpose",
      flex: 1,
      minWidth: 130,
      renderCell: (p) =>
        TRANSMITTAL_PURPOSES[p.row.purpose as TransmittalPurposeCode] ?? p.row.purpose,
    },
    {
      field: "dateIssued",
      headerName: "Date",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => p.row.dateIssued ?? "—",
    },
    {
      field: "pdf",
      headerName: "PDF",
      sortable: false,
      filterable: false,
      flex: 1.2,
      minWidth: 200,
      renderCell: (p) => <TransmittalPdfCell id={p.row.id} initialStatus={p.row.pdfStatus} />,
    },
  ];

  return (
    <>
      <Box
        className="esti-row-between"
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4 }}
      >
        <Typography variant="h6" component="h3">Transmittals</Typography>
        <Button
          variant="contained"
          size="small"
          disabled={ready.length === 0}
          onClick={() => setOpen(true)}
        >
          New transmittal
        </Button>
      </Box>
      {ready.length === 0 && <p>Upload &amp; process drawings first.</p>}
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" component="h4">
          Issued transmittals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drawing issue records with cover-sheet PDFs
        </Typography>
        <DataGrid
          rows={listQ.data?.rows ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New drawing transmittal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="tr-recipient"
              label="Recipient"
              value={form.recipient}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipient: e.target.value }))
              }
            />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                id="tr-purpose"
                select
                label="Purpose"
                value={form.purpose}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purpose: e.target.value }))
                }
                fullWidth
              >
                {(
                  Object.keys(TRANSMITTAL_PURPOSES) as TransmittalPurposeCode[]
                ).map((k) => (
                  <MenuItem key={k} value={k}>{TRANSMITTAL_PURPOSES[k]}</MenuItem>
                ))}
              </TextField>
              <TextField
                id="tr-channel"
                select
                label="Channel"
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channel: e.target.value }))
                }
                fullWidth
              >
                {(
                  Object.keys(TRANSMITTAL_CHANNELS) as TransmittalChannelCode[]
                ).map((k) => (
                  <MenuItem key={k} value={k}>{TRANSMITTAL_CHANNELS[k]}</MenuItem>
                ))}
              </TextField>
              <TextField
                id="tr-date"
                label="Date issued"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.dateIssued}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateIssued: e.target.value }))
                }
                fullWidth
              />
            </Box>

            <div>
              <Typography variant="body2" sx={{ mb: 0.5 }}>Drawings to include</Typography>
              {ready.map((d) => {
                const checked = d.id in picked;
                return (
                  <Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          id={`tr-d-${d.id}`}
                          checked={checked}
                          onChange={(e) => {
                            const c = e.target.checked;
                            setPicked((p) => {
                              const next = { ...p };
                              if (c) next[d.id] = 1;
                              else delete next[d.id];
                              return next;
                            });
                          }}
                        />
                      }
                      label={`${d.ref} — ${d.title}`}
                    />
                    {checked && (
                      <TextField
                        id={`tr-c-${d.id}`}
                        aria-label="Copy count"
                        size="small"
                        type="number"
                        value={String(picked[d.id])}
                        onChange={(e) =>
                          setPicked((p) => ({
                            ...p,
                            [d.id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        sx={{ maxWidth: 90 }}
                      />
                    )}
                  </Box>
                );
              })}
            </div>

            <TextField
              id="tr-notes"
              label="Notes (optional)"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.recipient || items.length === 0 || create.isPending}
            onClick={() =>
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
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
