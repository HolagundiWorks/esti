/**
 * Home-screen quick actions — the industry-standard "create" shortcuts a
 * principal reaches for first: a new project or a new lead (both created inline
 * here, so the dashboard never has to hand off to a list screen just to open a
 * modal), plus jump-offs to the task and invoice flows. Hidden for read-only
 * roles that cannot create. Material UI.
 */
import Business from "@mui/icons-material/Business";
import PersonAddAlt from "@mui/icons-material/PersonAddAlt";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import TaskAlt from "@mui/icons-material/TaskAlt";
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
  TextField,
} from "@mui/material";
import { LEAD_SOURCE_LABEL, LeadSource, ProjectType, can } from "@esti/contracts";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";

export function DashboardQuickActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const canWrite = can(user?.role, "write");

  const [projOpen, setProjOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  // ── New project ───────────────────────────────────────────────────────────
  const [pTitle, setPTitle] = useState("");
  const [pType, setPType] = useState<string>(ProjectType.options[0]);
  const [pClient, setPClient] = useState("");
  const clientsQ = trpc.clients.list.useQuery({ limit: 200, offset: 0 }, { enabled: projOpen });

  const createProject = trpc.projectOffice.create.useMutation({
    onSuccess: (row) => {
      void utils.projectOffice.list.invalidate();
      setProjOpen(false);
      setPTitle("");
      setPType(ProjectType.options[0]);
      setPClient("");
      navigate(`/projects/${row.id}`);
    },
  });

  // ── New lead ──────────────────────────────────────────────────────────────
  const [lName, setLName] = useState("");
  const [lPhone, setLPhone] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lType, setLType] = useState<string>(ProjectType.options[0]);
  const [lSource, setLSource] = useState<string>("WALK_IN");

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      setLeadOpen(false);
      setLName("");
      setLPhone("");
      setLEmail("");
      navigate("/leads");
    },
  });

  if (!canWrite) return null;

  const closeProj = () => {
    setProjOpen(false);
    createProject.reset();
  };
  const closeLead = () => {
    setLeadOpen(false);
    createLead.reset();
  };

  return (
    <Box className="esti-fill" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <span className="esti-label esti-label--secondary">QUICK ACTIONS</span>
        <div className="esti-row">
          <Button size="small" variant="contained" startIcon={<Business />} onClick={() => setProjOpen(true)}>
            New project
          </Button>
          <Button size="small" variant="outlined" startIcon={<PersonAddAlt />} onClick={() => setLeadOpen(true)}>
            New lead
          </Button>
          <Button size="small" variant="outlined" startIcon={<TaskAlt />} onClick={() => navigate("/tasks")}>
            New task
          </Button>
          <Button size="small" variant="outlined" startIcon={<ReceiptLong />} onClick={() => navigate("/invoices")}>
            New invoice
          </Button>
        </div>
      </Stack>

      {/* New project */}
      <Dialog aria-labelledby="dashboard-quick-actions-project-title" open={projOpen} onClose={closeProj} fullWidth maxWidth="xs">
        <DialogTitle id="dashboard-quick-actions-project-title">New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="qa-proj-title"
              label="Project title"
              value={pTitle}
              onChange={(e) => setPTitle(e.target.value)}
              fullWidth
            />
            <TextField
              id="qa-proj-type"
              select
              label="Project type"
              value={pType}
              onChange={(e) => setPType(e.target.value)}
              fullWidth
            >
              {ProjectType.options.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="qa-proj-client"
              select
              label="Client (optional)"
              value={pClient}
              onChange={(e) => setPClient(e.target.value)}
              fullWidth
            >
              <MenuItem value="">— none —</MenuItem>
              {(clientsQ.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            {createProject.error && (
              <Alert severity="error">{createProject.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={closeProj}>Cancel</Button>
          <Button
            variant="contained"
            disabled={pTitle.trim().length < 2 || createProject.isPending}
            onClick={() =>
              createProject.mutate({
                title: pTitle.trim(),
                projectType: pType as (typeof ProjectType.options)[number],
                clientId: pClient || undefined,
              })
            }
          >
            {createProject.isPending ? "Creating…" : "Create project"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New lead */}
      <Dialog aria-labelledby="dashboard-quick-actions-lead-title" open={leadOpen} onClose={closeLead} fullWidth maxWidth="xs">
        <DialogTitle id="dashboard-quick-actions-lead-title">New lead</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="qa-lead-name"
              label="Enquirer name"
              value={lName}
              onChange={(e) => setLName(e.target.value)}
              fullWidth
            />
            <TextField
              id="qa-lead-phone"
              label="Phone (optional)"
              value={lPhone}
              onChange={(e) => setLPhone(e.target.value)}
              fullWidth
            />
            <TextField
              id="qa-lead-email"
              label="Email (optional)"
              value={lEmail}
              onChange={(e) => setLEmail(e.target.value)}
              fullWidth
            />
            <TextField
              id="qa-lead-type"
              select
              label="Project type"
              value={lType}
              onChange={(e) => setLType(e.target.value)}
              fullWidth
            >
              {ProjectType.options.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="qa-lead-source"
              select
              label="Lead source"
              value={lSource}
              onChange={(e) => setLSource(e.target.value)}
              fullWidth
            >
              {LeadSource.options.map((s) => (
                <MenuItem key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</MenuItem>
              ))}
            </TextField>
            {createLead.error && (
              <Alert severity="error">{createLead.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={closeLead}>Cancel</Button>
          <Button
            variant="contained"
            disabled={lName.trim().length === 0 || createLead.isPending}
            onClick={() =>
              createLead.mutate({
                clientName: lName.trim(),
                phone: lPhone || undefined,
                email: lEmail || undefined,
                leadSource: lSource as (typeof LeadSource.options)[number],
                projectType: lType || undefined,
              })
            }
          >
            {createLead.isPending ? "Saving…" : "Capture lead"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
