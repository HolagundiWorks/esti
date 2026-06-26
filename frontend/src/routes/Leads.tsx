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
import {
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TAG,
  LeadSource,
  LeadStatus,
  PROJECT_WORK_TYPE_LABEL,
  ProjectWorkType,
  type LeadStatus as LeadStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

const SOURCE_OPTIONS = LeadSource.options;
const STATUS_OPTIONS = LeadStatus.options;
const TERMINAL: ReadonlySet<string> = new Set(["QUALIFIED", "DROPPED", "LOST"]);

export function Leads() {
  const utils = trpc.useUtils();
  const listQ = trpc.leads.list.useQuery({});
  const clientsQ = trpc.clients.list.useQuery({ limit: 200, offset: 0 });
  const inv = () => utils.leads.list.invalidate();

  // Create lead
  const [open, setOpen] = useState(false);
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

  return (
    <Stack gap={6}>
      <PageHeader
        title="Leads"
        description="Inbound enquiries — qualify, then convert to a draft project."
        actions={<Button onClick={() => setOpen(true)}>New lead</Button>}
      />

      <DataState
        loading={listQ.isLoading}
        isEmpty={leads.length === 0}
        columnCount={6}
        empty={{
          title: "No leads yet",
          description: "Capture an enquiry to start the acquisition funnel.",
          action: <Button size="sm" onClick={() => setOpen(true)}>New lead</Button>,
        }}
      >
        <TableContainer title={`${leads.length} leads`}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Enquirer</TableHeader>
                <TableHeader>Source</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((l) => {
                const terminal = TERMINAL.has(l.status);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.ref}</TableCell>
                    <TableCell>
                      <div>{l.clientName}</div>
                      <span className="esti-label--secondary">
                        {[l.phone, l.email].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{LEAD_SOURCE_LABEL[l.leadSource as keyof typeof LEAD_SOURCE_LABEL] ?? l.leadSource}</TableCell>
                    <TableCell>
                      {l.convertedProjectId ? (
                        <Link to={`/projects/${l.convertedProjectId}`}>{l.projectType || "View project"}</Link>
                      ) : (
                        <>
                          <div>{l.projectType || "—"}</div>
                          <span className="esti-label--secondary">{l.city || ""}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.convertedProjectId ? (
                        <Tag type={LEAD_STATUS_TAG[l.status as LeadStatusT] ?? "gray"} size="sm">
                          {LEAD_STATUS_LABEL[l.status as LeadStatusT] ?? l.status}
                        </Tag>
                      ) : (
                        <Select
                          id={`st-${l.id}`}
                          size="sm"
                          labelText=""
                          hideLabel
                          value={l.status}
                          disabled={setStatus.isPending}
                          onChange={(e) => setStatus.mutate({ id: l.id, status: e.target.value as LeadStatusT })}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} text={LEAD_STATUS_LABEL[s]} />
                          ))}
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {!terminal && (
                        <Button
                          kind="tertiary"
                          size="sm"
                          onClick={() => {
                            setConv({ projectTitle: l.projectType || l.clientName, projectType: l.projectType || "", workType: "ARCHITECTURE", clientId: "" });
                            setConvertId(l.id);
                          }}
                        >
                          Convert
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* Create lead */}
      <Modal
        open={open}
        modalHeading="New lead"
        primaryButtonText={create.isPending ? "Saving…" : "Capture lead"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.clientName || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
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
        <Stack gap={4}>
          <TextInput id="ld-name" labelText="Enquirer name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          <TextInput id="ld-phone" labelText="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextInput id="ld-email" labelText="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select id="ld-src" labelText="Lead source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
            {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s} text={LEAD_SOURCE_LABEL[s]} />)}
          </Select>
          <TextInput id="ld-ptype" labelText="Project type (optional)" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} />
          <TextInput id="ld-loc" labelText="Site location (optional)" value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} />
          <TextInput id="ld-city" labelText="City (optional)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextArea id="ld-notes" labelText="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {create.error && <InlineNotification kind="error" title="Error" subtitle={create.error.message} lowContrast />}
        </Stack>
      </Modal>

      {/* Convert lead */}
      <Modal
        open={!!convertId}
        modalHeading="Convert lead to draft project"
        primaryButtonText={convert.isPending ? "Converting…" : "Create draft project"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!conv.projectTitle || !conv.projectType || convert.isPending}
        onRequestClose={() => setConvertId(null)}
        onRequestSubmit={() => {
          if (!convertId) return;
          convert.mutate({
            id: convertId,
            projectTitle: conv.projectTitle,
            projectType: conv.projectType,
            workType: conv.workType as (typeof ProjectWorkType.options)[number],
            clientId: conv.clientId || undefined,
          });
        }}
      >
        <Stack gap={4}>
          <p className="esti-label--secondary">
            Creates a client (or reuses an existing one) and a draft project in ENQUIRY stage. The lead is marked Qualified.
          </p>
          <TextInput id="cv-title" labelText="Project title" value={conv.projectTitle} onChange={(e) => setConv({ ...conv, projectTitle: e.target.value })} />
          <TextInput id="cv-type" labelText="Project type" value={conv.projectType} onChange={(e) => setConv({ ...conv, projectType: e.target.value })} />
          <Select id="cv-work" labelText="Discipline" value={conv.workType} onChange={(e) => setConv({ ...conv, workType: e.target.value })}>
            {ProjectWorkType.options.map((t) => <SelectItem key={t} value={t} text={PROJECT_WORK_TYPE_LABEL[t]} />)}
          </Select>
          <Select id="cv-client" labelText="Client" value={conv.clientId} onChange={(e) => setConv({ ...conv, clientId: e.target.value })}>
            <SelectItem value="" text="— Create new client from lead —" />
            {(clientsQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
          </Select>
          {convert.error && <InlineNotification kind="error" title="Cannot convert" subtitle={convert.error.message} lowContrast />}
        </Stack>
      </Modal>
    </Stack>
  );
}
