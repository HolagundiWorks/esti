import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TAG,
  LeadSource,
  LeadStatus,
  PROJECT_WORK_TYPE_LABEL,
  ProjectType,
  ProjectWorkType,
  type LeadStatus as LeadStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusTag } from "../components/StatusTag.js";
import { ComplianceCalculator } from "../components/compliance/ComplianceCalculator.js";
import { trpc } from "../lib/trpc.js";

const SOURCE_OPTIONS = LeadSource.options;
const STATUS_OPTIONS = LeadStatus.options;
const TERMINAL: ReadonlySet<string> = new Set(["QUALIFIED", "DROPPED", "LOST"]);

export function Leads() {
  const utils = trpc.useUtils();
  const listQ = trpc.leads.list.useQuery({});
  const clientsQ = trpc.clients.list.useQuery({ limit: 200, offset: 0 });
  const inv = () => utils.leads.list.invalidate();

  const [tab, setTab] = useState(0);

  // Create lead
  const [open, setOpen] = useState(false);

  useScreenActions(
    [
      {
        id: "new-lead",
        zone: "center",
        tone: "primary",
        label: "New lead",
        icon: <AddIcon />,
        onClick: () => setOpen(true),
      },
    ],
    [],
  );

  const blank = {
    clientName: "",
    phone: "",
    email: "",
    leadSource: "WEBSITE",
    projectType: "",
    siteLocation: "",
    city: "",
    notes: "",
  };
  const [form, setForm] = useState(blank);
  const create = trpc.leads.create.useMutation({
    onSuccess: () => { inv(); setOpen(false); setForm(blank); },
  });

  const setStatus = trpc.leads.setStatus.useMutation({ onSuccess: inv });

  // Convert lead
  const [convertId, setConvertId] = useState<string | null>(null);
  const [conv, setConv] = useState({ projectTitle: "", projectType: "", workType: "ARCHITECTURE", clientId: "" });
  const convert = trpc.leads.convert.useMutation({
    onSuccess: () => { inv(); setConvertId(null); },
  });

  const leads = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.7, minWidth: 90 },
    {
      field: "clientName",
      headerName: "Enquirer",
      flex: 1.4,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 0.5 }}>
          <div>{p.row.clientName}</div>
          <span className="esti-label--secondary">
            {[p.row.phone, p.row.email].filter(Boolean).join(" · ") || "—"}
          </span>
        </Box>
      ),
    },
    {
      field: "leadSource",
      headerName: "Source",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) =>
        LEAD_SOURCE_LABEL[row.leadSource as keyof typeof LEAD_SOURCE_LABEL] ?? row.leadSource,
    },
    {
      field: "projectType",
      headerName: "Project",
      flex: 1.1,
      minWidth: 150,
      sortable: false,
      renderCell: (p) => {
        const l = p.row;
        return l.convertedProjectId ? (
          <Link to={`/projects/${l.convertedProjectId}`}>{l.projectType || "View project"}</Link>
        ) : (
          <Box sx={{ py: 0.5 }}>
            <div>{l.projectType || "—"}</div>
            <span className="esti-label--secondary">{l.city || ""}</span>
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.2,
      minWidth: 170,
      sortable: false,
      renderCell: (p) => {
        const l = p.row;
        return l.convertedProjectId ? (
          <StatusTag
            value={l.status as LeadStatusT}
            map={LEAD_STATUS_TAG}
            label={LEAD_STATUS_LABEL[l.status as LeadStatusT] ?? l.status}
          />
        ) : (
          <TextField
            id={`st-${l.id}`}
            select
            size="small"
            hiddenLabel
            value={l.status}
            disabled={setStatus.isPending}
            onChange={(e) => setStatus.mutate({ id: l.id, status: e.target.value as LeadStatusT })}
            sx={{ minWidth: 150 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) => {
        const l = p.row;
        if (TERMINAL.has(l.status)) return null;
        return (
          <RowActionsMenu
            actions={[
              {
                label: "Convert",
                onClick: () => {
                  // A lead's project type is free text — only carry it over
                  // if it matches a real ProjectType, else pick a valid default.
                  const carried = (ProjectType.options as readonly string[]).includes(l.projectType ?? "")
                    ? (l.projectType as string)
                    : ProjectType.options[0];
                  setConv({ projectTitle: l.projectType || l.clientName, projectType: carried, workType: "ARCHITECTURE", clientId: "" });
                  setConvertId(l.id);
                },
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <RailLayout
        title="Leads"
        description="Inbound enquiries — qualify, then convert to a draft project."
        tabs={
          <Tabs
            orientation="vertical"
            value={tab}
            onChange={(_e, v) => setTab(v)}
            aria-label="Lead development sections"
          >
            <Tab label="Lead register" />
            <Tab label="Permissible development" />
          </Tabs>
        }
      >
        {tab === 0 && (
        <DataState
          loading={listQ.isLoading}
          isEmpty={leads.length === 0}
          columnCount={6}
          empty={{
            title: "No leads yet",
            description: "Capture an enquiry to start the acquisition funnel.",
          }}
        >
          <DataGrid
            rows={leads}
            columns={columns}
            getRowHeight={() => "auto"}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </DataState>
      )}
        {tab === 1 && <ComplianceCalculator />}
      </RailLayout>

      {/* Create lead */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New lead</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="ld-name" label="Enquirer name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            <TextField id="ld-phone" label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField id="ld-email" label="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField id="ld-src" select label="Lead source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
              {SOURCE_OPTIONS.map((s) => <MenuItem key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</MenuItem>)}
            </TextField>
            <TextField id="ld-ptype" label="Project type (optional)" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} />
            <TextField id="ld-loc" label="Site location (optional)" value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} />
            <TextField id="ld-city" label="City (optional)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextField id="ld-notes" label="Notes (optional)" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {create.error && <Alert severity="error">{create.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.clientName || create.isPending}
            onClick={() =>
              create.mutate({
                clientName: form.clientName,
                phone: form.phone || undefined,
                email: form.email || undefined,
                leadSource: form.leadSource as (typeof SOURCE_OPTIONS)[number],
                projectType: form.projectType || undefined,
                siteLocation: form.siteLocation || undefined,
                city: form.city || undefined,
                notes: form.notes || undefined,
              })
            }
          >
            {create.isPending ? "Saving…" : "Capture lead"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert lead */}
      <Dialog open={!!convertId} onClose={() => setConvertId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Convert lead to draft project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <p className="esti-label--secondary">
              Creates a client (or reuses an existing one) and a draft project in ENQUIRY stage. The lead is marked Qualified.
            </p>
            <TextField id="cv-title" label="Project title" value={conv.projectTitle} onChange={(e) => setConv({ ...conv, projectTitle: e.target.value })} />
            <TextField id="cv-type" select label="Project type" value={conv.projectType} onChange={(e) => setConv({ ...conv, projectType: e.target.value })}>
              {ProjectType.options.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField id="cv-work" select label="Discipline" value={conv.workType} onChange={(e) => setConv({ ...conv, workType: e.target.value })}>
              {ProjectWorkType.options.map((t) => <MenuItem key={t} value={t}>{PROJECT_WORK_TYPE_LABEL[t]}</MenuItem>)}
            </TextField>
            <TextField id="cv-client" select label="Client" value={conv.clientId} onChange={(e) => setConv({ ...conv, clientId: e.target.value })}>
              <MenuItem value="">— Create new client from lead —</MenuItem>
              {(clientsQ.data ?? []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            {convert.error && <Alert severity="error">{convert.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setConvertId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!conv.projectTitle || !conv.projectType || convert.isPending}
            onClick={() => {
              if (!convertId) return;
              convert.mutate({
                id: convertId,
                projectTitle: conv.projectTitle,
                projectType: conv.projectType as (typeof ProjectType.options)[number],
                workType: conv.workType as (typeof ProjectWorkType.options)[number],
                clientId: conv.clientId || undefined,
              });
            }}
          >
            {convert.isPending ? "Converting…" : "Create draft project"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
