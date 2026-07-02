import {
  Button,
  InlineLoading,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  CLIENT_DISCUSSION_OUTCOME_LABEL,
  CLIENT_DISCUSSION_OUTCOME_TAG,
  CLIENT_LOG_KINDS,
  ClientDiscussionOutcome,
  type ClientDiscussionOutcome as ClientDiscussionOutcomeT,
  type ClientLogKindCode,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { ContextualComments } from "./ContextualComments.js";

type Category = "clientlog" | "internal" | "critical" | "site" | "revision";

const CAT: Record<Category, { label: string; tagType: "blue" | "gray" | "red" | "teal" | "purple" }> = {
  clientlog: { label: "Client Log", tagType: "blue" },
  internal:  { label: "Internal",   tagType: "gray" },
  critical:  { label: "Critical",   tagType: "red" },
  site:      { label: "Site Changes", tagType: "teal" },
  revision:  { label: "Revision Required", tagType: "purple" },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Client Log ───────────────────────────────────────────────
const KIND_TAG: Partial<Record<ClientLogKindCode, "blue" | "green" | "purple" | "teal" | "gray">> = {
  DECISION: "purple", APPROVAL: "green", MEETING: "blue", SITE_VISIT: "teal",
};

function ClientLogPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const logQ  = trpc.clientLog.listByProject.useQuery({ projectId });
  const invalidate = () => utils.clientLog.listByProject.invalidate({ projectId });
  const remove = trpc.clientLog.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ClientLogKindCode>("MEETING");
  const [occurredAt, setOccurredAt] = useState(today());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [outcome, setOutcome] = useState("");
  const [budgetObjections, setBudgetObjections] = useState("");

  const create = trpc.clientLog.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setSubject(""); setBody(""); setFollowUp(""); setOutcome(""); setBudgetObjections("");
    },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--cds-spacing-05)" }}>
        <p className="esti-label--secondary">Meetings, calls, approvals, and decisions with the client.</p>
        <Button size="sm" onClick={() => setOpen(true)}>Log interaction</Button>
      </div>
      {logQ.isLoading && <InlineLoading description="Loading…" />}
      {(logQ.data ?? []).length === 0 && !logQ.isLoading && <p>No interactions logged yet.</p>}
      <Stack gap={3}>
        {(logQ.data ?? []).map((e) => (
          <div key={e.id} style={{ borderLeft: "3px solid var(--cds-border-subtle-01)", paddingLeft: "var(--cds-spacing-04)" }}>
            <div style={{ display: "flex", gap: "var(--cds-spacing-03)", alignItems: "center", flexWrap: "wrap" }}>
              <Tag type={KIND_TAG[e.kind as ClientLogKindCode] ?? "gray"} size="sm">
                {CLIENT_LOG_KINDS[e.kind as ClientLogKindCode] ?? e.kind}
              </Tag>
              {e.outcome && (
                <Tag
                  type={
                    (CLIENT_DISCUSSION_OUTCOME_TAG as Record<string, "green" | "blue" | "red" | "teal" | "purple">)[e.outcome] ?? "gray"
                  }
                  size="sm"
                >
                  {(CLIENT_DISCUSSION_OUTCOME_LABEL as Record<string, string>)[e.outcome] ?? e.outcome}
                </Tag>
              )}
              <strong>{e.subject}</strong>
              <span className="esti-label--secondary">{e.occurredAt}</span>
              <Button
                kind="ghost" size="sm" style={{ marginLeft: "auto" }}
                onClick={() => remove.mutate({ id: e.id })}
              >
                Remove
              </Button>
            </div>
            {e.body && <p style={{ margin: "var(--cds-spacing-02) 0", whiteSpace: "pre-wrap" }}>{e.body}</p>}
            {e.followUpDate && (
              <span className="esti-label--secondary">Follow-up: {e.followUpDate}</span>
            )}
          </div>
        ))}
      </Stack>

      <Modal
        open={open}
        modalHeading="Log client interaction"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!subject || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId, kind, occurredAt, subject,
            body: body || undefined,
            followUpDate: followUp || null,
            outcome: (outcome || undefined) as ClientDiscussionOutcomeT | undefined,
            budgetObjections: budgetObjections || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select id="cl-kind" labelText="Type" value={kind} onChange={(e) => setKind(e.target.value as ClientLogKindCode)}>
            {(Object.keys(CLIENT_LOG_KINDS) as ClientLogKindCode[]).map((k) => (
              <SelectItem key={k} value={k} text={CLIENT_LOG_KINDS[k]} />
            ))}
          </Select>
          <TextInput id="cl-date" labelText="Date" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          <TextInput id="cl-subject" labelText="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <TextArea id="cl-body" labelText="Notes (optional)" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <TextInput id="cl-followup" labelText="Follow-up date (optional)" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          <Select id="cl-outcome" labelText="Discussion outcome (optional)" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <SelectItem value="" text="— None —" />
            {ClientDiscussionOutcome.options.map((o) => (
              <SelectItem key={o} value={o} text={CLIENT_DISCUSSION_OUTCOME_LABEL[o]} />
            ))}
          </Select>
          <TextArea id="cl-budget" labelText="Budget objections (optional)" rows={2} value={budgetObjections} onChange={(e) => setBudgetObjections(e.target.value)} />
        </Stack>
      </Modal>
    </>
  );
}

// ── Critical notes ───────────────────────────────────────────
const PRIORITY_TAG: Record<string, "red" | "purple" | "gray"> = {
  HIGH: "red", MEDIUM: "purple", LOW: "gray",
};
const STATUS_TAG: Record<string, "red" | "gray" | "green"> = {
  OPEN: "red", BLOCKED: "gray", RESOLVED: "green",
};

function CriticalPanel({ projectId }: { projectId: string }) {
  const utils  = trpc.useUtils();
  const notesQ = trpc.criticalNotes.listByProject.useQuery({ projectId, limit: 50 });
  const invalidate = () => utils.criticalNotes.listByProject.invalidate({ projectId });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("OPEN");
  const [body, setBody] = useState("");

  const create = trpc.criticalNotes.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTitle(""); setCategory(""); setBody("");
    },
  });

  const items = notesQ.data?.rows ?? [];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--cds-spacing-05)" }}>
        <p className="esti-label--secondary">Red-flag items requiring immediate attention.</p>
        <Button size="sm" onClick={() => setOpen(true)}>Add critical note</Button>
      </div>
      {notesQ.isLoading && <InlineLoading description="Loading…" />}
      {items.length === 0 && !notesQ.isLoading && <p>No critical notes.</p>}
      <Stack gap={3}>
        {items.map((n) => (
          <div key={n.id} style={{ borderLeft: "3px solid var(--cds-support-error)", paddingLeft: "var(--cds-spacing-04)" }}>
            <div style={{ display: "flex", gap: "var(--cds-spacing-03)", alignItems: "center", flexWrap: "wrap" }}>
              <Tag type={PRIORITY_TAG[n.priority] ?? "gray"} size="sm">{n.priority}</Tag>
              <Tag type={STATUS_TAG[n.status] ?? "gray"} size="sm">{n.status}</Tag>
              <Tag type="gray" size="sm">{n.category}</Tag>
              <strong>{n.title}</strong>
              {n.owner && <span className="esti-label--secondary">Owner: {n.owner}</span>}
              {n.dueDate && <span className="esti-label--secondary">Due: {n.dueDate}</span>}
            </div>
            {n.body && <p style={{ margin: "var(--cds-spacing-02) 0", whiteSpace: "pre-wrap" }}>{n.body}</p>}
          </div>
        ))}
      </Stack>

      <Modal
        open={open}
        modalHeading="Add critical note"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || !category || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId, title, category,
            priority: priority as "LOW" | "MEDIUM" | "HIGH",
            status: status as "OPEN" | "BLOCKED" | "RESOLVED",
            body: body || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="cn-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextInput id="cn-cat" labelText="Category (e.g. Structural, Fire Safety)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Select id="cn-priority" labelText="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["HIGH", "MEDIUM", "LOW"].map((p) => <SelectItem key={p} value={p} text={p} />)}
          </Select>
          <Select id="cn-status" labelText="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["OPEN", "BLOCKED", "RESOLVED"].map((s) => <SelectItem key={s} value={s} text={s} />)}
          </Select>
          <TextArea id="cn-body" labelText="Notes (optional)" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </Stack>
      </Modal>
    </>
  );
}

// ── Site Changes (site instructions) ────────────────────────
function SiteChangesPanel({ projectId }: { projectId: string }) {
  const utils   = trpc.useUtils();
  const siteInsQ = trpc.siteInstructions.listByProject.useQuery(
    { projectId },
    { retry: false },
  );
  const invalidate = () => utils.siteInstructions.listByProject.invalidate({ projectId });

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [issuedAt, setIssuedAt] = useState(today());

  const create = trpc.siteInstructions.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setSubject(""); setBody("");
    },
  });

  if (siteInsQ.isError) {
    return (
      <InlineNotification
        kind="info"
        title="Site supervision not enabled"
        subtitle="Enable site supervision for this project to track site instructions."
        hideCloseButton
      />
    );
  }

  const items = siteInsQ.data ?? [];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--cds-spacing-05)" }}>
        <p className="esti-label--secondary">Architectural instructions and changes arising from site.</p>
        <Button size="sm" onClick={() => setOpen(true)}>Add site instruction</Button>
      </div>
      {siteInsQ.isLoading && <InlineLoading description="Loading…" />}
      {items.length === 0 && !siteInsQ.isLoading && <p>No site instructions recorded.</p>}
      <Stack gap={3}>
        {items.map((si) => (
          <div key={si.id} style={{ borderLeft: "3px solid var(--cds-border-interactive)", paddingLeft: "var(--cds-spacing-04)" }}>
            <div style={{ display: "flex", gap: "var(--cds-spacing-03)", alignItems: "center", flexWrap: "wrap" }}>
              <Tag type="teal" size="sm">{si.ref}</Tag>
              <strong>{si.subject}</strong>
              <span className="esti-label--secondary">{si.issuedAt}</span>
            </div>
            {si.body && <p style={{ margin: "var(--cds-spacing-02) 0", whiteSpace: "pre-wrap" }}>{si.body}</p>}
          </div>
        ))}
      </Stack>

      <Modal
        open={open}
        modalHeading="Add site instruction"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!subject || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({ projectId, subject, body: body || undefined, issuedAt })
        }
      >
        <Stack gap={5}>
          <TextInput id="si-subject" labelText="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <TextInput id="si-date" labelText="Date" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
          <TextArea id="si-body" labelText="Details (optional)" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </Stack>
      </Modal>
    </>
  );
}

// ── Revision Required (decisions with revisionCategory) ──────
const REVISION_CAT_TAG: Record<string, "red" | "purple" | "gray"> = {
  CRITICAL: "red", MAJOR: "purple", MINOR: "gray",
};
const REVISION_SOURCE_LABEL: Record<string, string> = {
  CLIENT_DRIVEN: "Client Driven",
  INTERNAL_ERROR: "Internal Error",
  TECHNICAL_QUERY: "Technical Query",
  SCOPE_CHANGE: "Scope Change",
};

function RevisionPanel({ projectId }: { projectId: string }) {
  const utils      = trpc.useUtils();
  const decisionsQ = trpc.decisions.listByProject.useQuery({ projectId, limit: 100 });
  const invalidate = () => utils.decisions.listByProject.invalidate({ projectId });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [revisionCategory, setRevisionCategory] = useState("MINOR");
  const [revisionSource, setRevisionSource] = useState("CLIENT_DRIVEN");

  const create = trpc.decisions.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTitle(""); setRationale("");
    },
  });

  const items = (decisionsQ.data?.rows ?? []).filter((d) => d.revisionCategory != null);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--cds-spacing-05)" }}>
        <p className="esti-label--secondary">Design revisions — by category and source.</p>
        <Button size="sm" onClick={() => setOpen(true)}>Record revision</Button>
      </div>
      {decisionsQ.isLoading && <InlineLoading description="Loading…" />}
      {items.length === 0 && !decisionsQ.isLoading && <p>No revision records.</p>}
      <Stack gap={3}>
        {items.map((d) => (
          <div key={d.id} style={{ borderLeft: "3px solid var(--cds-support-warning)", paddingLeft: "var(--cds-spacing-04)" }}>
            <div style={{ display: "flex", gap: "var(--cds-spacing-03)", alignItems: "center", flexWrap: "wrap" }}>
              <Tag type={REVISION_CAT_TAG[d.revisionCategory!] ?? "gray"} size="sm">
                {d.revisionCategory}
              </Tag>
              {d.revisionSource && (
                <Tag type="gray" size="sm">
                  {REVISION_SOURCE_LABEL[d.revisionSource] ?? d.revisionSource}
                </Tag>
              )}
              <strong>{d.title}</strong>
              <Tag type="gray" size="sm">{d.state}</Tag>
            </div>
            {d.rationale && <p style={{ margin: "var(--cds-spacing-02) 0", whiteSpace: "pre-wrap" }}>{d.rationale}</p>}
          </div>
        ))}
      </Stack>

      <Modal
        open={open}
        modalHeading="Record revision"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || !rationale || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId, title, rationale,
            revisionCategory: revisionCategory as "MINOR" | "MAJOR" | "CRITICAL",
            revisionSource: revisionSource as
              | "CLIENT_DRIVEN"
              | "INTERNAL_ERROR"
              | "TECHNICAL_QUERY"
              | "SCOPE_CHANGE",
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="rv-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea id="rv-rationale" labelText="Rationale / description" rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
          <Select id="rv-cat" labelText="Revision category" value={revisionCategory} onChange={(e) => setRevisionCategory(e.target.value)}>
            {["MINOR", "MAJOR", "CRITICAL"].map((c) => <SelectItem key={c} value={c} text={c} />)}
          </Select>
          <Select id="rv-source" labelText="Revision source" value={revisionSource} onChange={(e) => setRevisionSource(e.target.value)}>
            {Object.entries(REVISION_SOURCE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} text={v} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </>
  );
}

// ── Main export ──────────────────────────────────────────────
export function ProjectCommunicationsLog({ projectId }: { projectId: string }) {
  const [active, setActive] = useState<Category>("clientlog");

  return (
    <div style={{ marginTop: "var(--cds-spacing-06)" }}>
      <div style={{ display: "flex", gap: "var(--cds-spacing-03)", flexWrap: "wrap", marginBottom: "var(--cds-spacing-06)" }}>
        {(Object.entries(CAT) as [Category, (typeof CAT)[Category]][]).map(([key, cfg]) => (
          <Tag
            key={key}
            type={active === key ? cfg.tagType : "gray"}
            onClick={() => setActive(key)}
            style={{ cursor: "pointer" }}
          >
            {cfg.label}
          </Tag>
        ))}
      </div>

      {active === "clientlog" && <ClientLogPanel projectId={projectId} />}
      {active === "internal" && (
        <ContextualComments
          projectId={projectId}
          objectType="projectoffice"
          objectId={projectId}
          heading="Internal discussion"
          description="Internal team notes and discussions for this project."
        />
      )}
      {active === "critical"  && <CriticalPanel    projectId={projectId} />}
      {active === "site"      && <SiteChangesPanel projectId={projectId} />}
      {active === "revision"  && <RevisionPanel    projectId={projectId} />}
    </div>
  );
}
