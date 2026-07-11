import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useScreenActions } from "@hcw/ui-kit";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { PdfActionButtons } from "../components/PdfActionButtons.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { trpc } from "../lib/trpc.js";

function LetterPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.letters.byId.useQuery(
    { id },
    {
      enabled: initial !== "NONE",
      refetchInterval: (query) => pdfPollInterval(query.state.data?.pdfStatus, initial !== "NONE"),
    },
  );
  const gen = trpc.letters.generatePdf.useMutation({
    onSuccess: () => utils.letters.byId.invalidate({ id }),
  });
  return (
    <PdfActionButtons
      status={q.data?.pdfStatus ?? initial}
      url={q.data?.pdfUrl ?? null}
      generatePending={gen.isPending}
      onGenerate={() => gen.mutate({ id })}
      share={{ text: "Please find the attached letter.", fileName: "letter.pdf" }}
    />
  );
}

export function Letters() {
  const utils = trpc.useUtils();
  const listQ = trpc.letters.list.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const templatesQ = trpc.documents.listTemplates.useQuery({ kind: "LETTER" });
  const inv = () => utils.letters.list.invalidate();

  const [open, setOpen] = useState(false);

  useScreenActions(
    open
      ? []
      : [
          {
            id: "new-letter",
            zone: "center",
            tone: "primary",
            label: "New letter",
            icon: <AddIcon />,
            onClick: () => setOpen(true),
          },
        ],
    [open],
  );

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

  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    { field: "recipient", headerName: "Recipient", flex: 1, minWidth: 140 },
    { field: "subject", headerName: "Subject", flex: 2, minWidth: 200 },
    {
      field: "document",
      headerName: "Document",
      sortable: false,
      filterable: false,
      flex: 1.4,
      minWidth: 200,
      renderCell: (p) => <LetterPdf id={p.row.id} initial={p.row.pdfStatus} />,
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            { label: "Delete", onClick: () => setConfirmId(p.row.id), danger: true },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Letters"
        description="Office correspondence on firm letterhead."
        aside={
          <Stack spacing={1.5}>
            <Button component={Link} to="/office/documents" variant="text" size="small" fullWidth>
              Document register
            </Button>
          </Stack>
        }
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Letters" }]} />
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={5}
          empty={{
            title: "No letters yet",
            description: "Draft a letter and export it as a branded PDF.",
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            autoHeight
          />
        </DataState>
      </RailLayout>

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

      <Dialog aria-labelledby="letters-create-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="letters-create-title">New letter</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="l-tpl"
              select
              label="Start from template (optional)"
              value=""
              onChange={(e) => {
                const t = (templatesQ.data ?? []).find((x) => x.id === e.target.value);
                if (t) setF((x) => ({ ...x, subject: t.title, body: t.body }));
              }}
            >
              <MenuItem value="">— blank letter —</MenuItem>
              {(templatesQ.data ?? []).map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                id="l-to"
                label="Recipient"
                value={f.recipient}
                onChange={set("recipient")}
                sx={{ flex: 1 }}
              />
              <TextField
                id="l-date"
                label="Date"
                type="date"
                value={f.dateLetter}
                onChange={set("dateLetter")}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              id="l-proj"
              select
              label="Related project (optional)"
              value={f.projectId}
              onChange={set("projectId")}
            >
              <MenuItem value="">— none —</MenuItem>
              {(projectsQ.data ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{`${p.ref} — ${p.title}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="l-subj"
              label="Subject"
              value={f.subject}
              onChange={set("subject")}
            />
            <TextField
              id="l-body"
              label="Body"
              multiline
              rows={10}
              value={f.body}
              onChange={set("body")}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!f.recipient || !f.subject || !f.body || create.isPending}
            onClick={() =>
              create.mutate({
                projectId: f.projectId || undefined,
                recipient: f.recipient,
                subject: f.subject,
                body: f.body,
                dateLetter: f.dateLetter || undefined,
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
