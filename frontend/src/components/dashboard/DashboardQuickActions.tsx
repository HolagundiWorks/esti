/**
 * Home-screen quick actions — the industry-standard "create" shortcuts a
 * principal reaches for first: a new project or a new lead (both created inline
 * here, so the dashboard never has to hand off to a list screen just to open a
 * modal), plus jump-offs to the task and invoice flows. Hidden for read-only
 * roles that cannot create.
 */
import { Building, Receipt, Task, UserFollow } from "@carbon/icons-react";
import {
  Button,
  Form,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
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

  return (
    <Tile className="esti-fill">
      <Stack gap={4}>
        <span className="esti-label esti-label--secondary">QUICK ACTIONS</span>
        <div className="esti-row">
          <Button size="sm" renderIcon={Building} onClick={() => setProjOpen(true)}>
            New project
          </Button>
          <Button size="sm" kind="tertiary" renderIcon={UserFollow} onClick={() => setLeadOpen(true)}>
            New lead
          </Button>
          <Button size="sm" kind="tertiary" renderIcon={Task} onClick={() => navigate("/tasks")}>
            New task
          </Button>
          <Button size="sm" kind="tertiary" renderIcon={Receipt} onClick={() => navigate("/invoices")}>
            New invoice
          </Button>
        </div>
      </Stack>

      {/* New project */}
      <Modal
        open={projOpen}
        modalHeading="New project"
        primaryButtonText={createProject.isPending ? "Creating…" : "Create project"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={pTitle.trim().length < 2 || createProject.isPending}
        onRequestClose={() => {
          setProjOpen(false);
          createProject.reset();
        }}
        onRequestSubmit={() =>
          createProject.mutate({
            title: pTitle.trim(),
            projectType: pType as (typeof ProjectType.options)[number],
            clientId: pClient || undefined,
          })
        }
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Stack gap={5}>
            <TextInput
              id="qa-proj-title"
              labelText="Project title"
              value={pTitle}
              onChange={(e) => setPTitle(e.target.value)}
            />
            <Select
              id="qa-proj-type"
              labelText="Project type"
              value={pType}
              onChange={(e) => setPType(e.target.value)}
            >
              {ProjectType.options.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <Select
              id="qa-proj-client"
              labelText="Client (optional)"
              value={pClient}
              onChange={(e) => setPClient(e.target.value)}
            >
              <SelectItem value="" text="— none —" />
              {(clientsQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id} text={c.name} />
              ))}
            </Select>
            {createProject.error && (
              <InlineNotification
                kind="error"
                lowContrast
                title="Could not create project"
                subtitle={createProject.error.message}
              />
            )}
          </Stack>
        </Form>
      </Modal>

      {/* New lead */}
      <Modal
        open={leadOpen}
        modalHeading="New lead"
        primaryButtonText={createLead.isPending ? "Saving…" : "Capture lead"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={lName.trim().length === 0 || createLead.isPending}
        onRequestClose={() => {
          setLeadOpen(false);
          createLead.reset();
        }}
        onRequestSubmit={() =>
          createLead.mutate({
            clientName: lName.trim(),
            phone: lPhone || undefined,
            email: lEmail || undefined,
            leadSource: lSource as (typeof LeadSource.options)[number],
            projectType: lType || undefined,
          })
        }
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Stack gap={5}>
            <TextInput
              id="qa-lead-name"
              labelText="Enquirer name"
              value={lName}
              onChange={(e) => setLName(e.target.value)}
            />
            <TextInput
              id="qa-lead-phone"
              labelText="Phone (optional)"
              value={lPhone}
              onChange={(e) => setLPhone(e.target.value)}
            />
            <TextInput
              id="qa-lead-email"
              labelText="Email (optional)"
              value={lEmail}
              onChange={(e) => setLEmail(e.target.value)}
            />
            <Select
              id="qa-lead-type"
              labelText="Project type"
              value={lType}
              onChange={(e) => setLType(e.target.value)}
            >
              {ProjectType.options.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <Select
              id="qa-lead-source"
              labelText="Lead source"
              value={lSource}
              onChange={(e) => setLSource(e.target.value)}
            >
              {LeadSource.options.map((s) => (
                <SelectItem key={s} value={s} text={LEAD_SOURCE_LABEL[s]} />
              ))}
            </Select>
            {createLead.error && (
              <InlineNotification
                kind="error"
                lowContrast
                title="Could not create lead"
                subtitle={createLead.error.message}
              />
            )}
          </Stack>
        </Form>
      </Modal>
    </Tile>
  );
}
