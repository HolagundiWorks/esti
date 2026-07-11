import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
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
import { StatusDot } from "./StatusTag.js";

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

function Loading() {
  return (
    <Stack spacing={0.5}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={32} />
      ))}
    </Stack>
  );
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <p className="esti-label--secondary">Meetings, calls, approvals, and decisions with the client.</p>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>Log interaction</Button>
      </Box>
      {logQ.isLoading && <Loading />}
      {(logQ.data ?? []).length === 0 && !logQ.isLoading && <p>No interactions logged yet.</p>}
      <Stack spacing={1}>
        {(logQ.data ?? []).map((e) => (
          <Box key={e.id} sx={{ borderLeft: "3px solid var(--cds-border-subtle-01)", pl: 1.5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <StatusDot
                color={KIND_TAG[e.kind as ClientLogKindCode] ?? "gray"}
                label={CLIENT_LOG_KINDS[e.kind as ClientLogKindCode] ?? e.kind}
              />
              {e.outcome && (
                <StatusDot
                  color={
                    (CLIENT_DISCUSSION_OUTCOME_TAG as Record<string, "green" | "blue" | "red" | "teal" | "purple">)[e.outcome] ?? "gray"
                  }
                  label={(CLIENT_DISCUSSION_OUTCOME_LABEL as Record<string, string>)[e.outcome] ?? e.outcome}
                />
              )}
              <strong>{e.subject}</strong>
              <span className="esti-label--secondary">{e.occurredAt}</span>
              <Button
                variant="text" size="small" sx={{ ml: "auto" }}
                onClick={() => remove.mutate({ id: e.id })}
              >
                Remove
              </Button>
            </Box>
            {e.body && <Box component="p" sx={{ my: 0.5, whiteSpace: "pre-wrap" }}>{e.body}</Box>}
            {e.followUpDate && (
              <span className="esti-label--secondary">Follow-up: {e.followUpDate}</span>
            )}
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log client interaction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="cl-kind" select label="Type" value={kind} onChange={(e) => setKind(e.target.value as ClientLogKindCode)}>
              {(Object.keys(CLIENT_LOG_KINDS) as ClientLogKindCode[]).map((k) => (
                <MenuItem key={k} value={k}>{CLIENT_LOG_KINDS[k]}</MenuItem>
              ))}
            </TextField>
            <TextField id="cl-date" label="Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            <TextField id="cl-subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <TextField id="cl-body" label="Notes (optional)" multiline rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <TextField id="cl-followup" label="Follow-up date (optional)" type="date" slotProps={{ inputLabel: { shrink: true } }} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            <TextField id="cl-outcome" select label="Discussion outcome (optional)" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <MenuItem value="">— None —</MenuItem>
              {ClientDiscussionOutcome.options.map((o) => (
                <MenuItem key={o} value={o}>{CLIENT_DISCUSSION_OUTCOME_LABEL[o]}</MenuItem>
              ))}
            </TextField>
            <TextField id="cl-budget" label="Budget objections (optional)" multiline rows={2} value={budgetObjections} onChange={(e) => setBudgetObjections(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!subject || create.isPending}
            onClick={() =>
              create.mutate({
                projectId, kind, occurredAt, subject,
                body: body || undefined,
                followUpDate: followUp || null,
                outcome: (outcome || undefined) as ClientDiscussionOutcomeT | undefined,
                budgetObjections: budgetObjections || undefined,
              })
            }
          >
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <p className="esti-label--secondary">Red-flag items requiring immediate attention.</p>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>Add critical note</Button>
      </Box>
      {notesQ.isLoading && <Loading />}
      {items.length === 0 && !notesQ.isLoading && <p>No critical notes.</p>}
      <Stack spacing={1}>
        {items.map((n) => (
          <Box key={n.id} sx={{ borderLeft: "3px solid var(--cds-support-error)", pl: 1.5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <StatusDot color={PRIORITY_TAG[n.priority] ?? "gray"} label={n.priority} />
              <StatusDot color={STATUS_TAG[n.status] ?? "gray"} label={n.status} />
              <StatusDot color="gray" label={n.category} />
              <strong>{n.title}</strong>
              {n.owner && <span className="esti-label--secondary">Owner: {n.owner}</span>}
              {n.dueDate && <span className="esti-label--secondary">Due: {n.dueDate}</span>}
            </Box>
            {n.body && <Box component="p" sx={{ my: 0.5, whiteSpace: "pre-wrap" }}>{n.body}</Box>}
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add critical note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="cn-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField id="cn-cat" label="Category (e.g. Structural, Fire Safety)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <TextField id="cn-priority" select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {["HIGH", "MEDIUM", "LOW"].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField id="cn-status" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["OPEN", "BLOCKED", "RESOLVED"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField id="cn-body" label="Notes (optional)" multiline rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title || !category || create.isPending}
            onClick={() =>
              create.mutate({
                projectId, title, category,
                priority: priority as "LOW" | "MEDIUM" | "HIGH",
                status: status as "OPEN" | "BLOCKED" | "RESOLVED",
                body: body || undefined,
              })
            }
          >
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
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
      <Alert severity="info">
        <AlertTitle>Site supervision not enabled</AlertTitle>
        Enable site supervision for this project to track site instructions.
      </Alert>
    );
  }

  const items = siteInsQ.data ?? [];

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <p className="esti-label--secondary">Architectural instructions and changes arising from site.</p>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>Add site instruction</Button>
      </Box>
      {siteInsQ.isLoading && <Loading />}
      {items.length === 0 && !siteInsQ.isLoading && <p>No site instructions recorded.</p>}
      <Stack spacing={1}>
        {items.map((si) => (
          <Box key={si.id} sx={{ borderLeft: "3px solid var(--cds-border-interactive)", pl: 1.5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <StatusDot color="teal" label={si.ref} />
              <strong>{si.subject}</strong>
              <span className="esti-label--secondary">{si.issuedAt}</span>
            </Box>
            {si.body && <Box component="p" sx={{ my: 0.5, whiteSpace: "pre-wrap" }}>{si.body}</Box>}
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add site instruction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="si-subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <TextField id="si-date" label="Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            <TextField id="si-body" label="Details (optional)" multiline rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!subject || create.isPending}
            onClick={() =>
              create.mutate({ projectId, subject, body: body || undefined, issuedAt })
            }
          >
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <p className="esti-label--secondary">Design revisions — by category and source.</p>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>Record revision</Button>
      </Box>
      {decisionsQ.isLoading && <Loading />}
      {items.length === 0 && !decisionsQ.isLoading && <p>No revision records.</p>}
      <Stack spacing={1}>
        {items.map((d) => (
          <Box key={d.id} sx={{ borderLeft: "3px solid var(--cds-support-warning)", pl: 1.5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <StatusDot
                color={REVISION_CAT_TAG[d.revisionCategory!] ?? "gray"}
                label={d.revisionCategory}
              />
              {d.revisionSource && (
                <StatusDot
                  color="gray"
                  label={REVISION_SOURCE_LABEL[d.revisionSource] ?? d.revisionSource}
                />
              )}
              <strong>{d.title}</strong>
              <StatusDot color="gray" label={d.state} />
            </Box>
            {d.rationale && <Box component="p" sx={{ my: 0.5, whiteSpace: "pre-wrap" }}>{d.rationale}</Box>}
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record revision</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="rv-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField id="rv-rationale" label="Rationale / description" multiline rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
            <TextField id="rv-cat" select label="Revision category" value={revisionCategory} onChange={(e) => setRevisionCategory(e.target.value)}>
              {["MINOR", "MAJOR", "CRITICAL"].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField id="rv-source" select label="Revision source" value={revisionSource} onChange={(e) => setRevisionSource(e.target.value)}>
              {Object.entries(REVISION_SOURCE_LABEL).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title || !rationale || create.isPending}
            onClick={() =>
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
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Main export ──────────────────────────────────────────────
export function ProjectCommunicationsLog({ projectId }: { projectId: string }) {
  const [active, setActive] = useState<Category>("clientlog");

  return (
    <Box sx={{ mt: 3 }}>
      <Tabs
        value={active}
        onChange={(_, v: Category) => setActive(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Communication category"
        sx={{ mb: 3 }}
      >
        {(Object.entries(CAT) as [Category, (typeof CAT)[Category]][]).map(([key, cfg]) => (
          <Tab key={key} value={key} label={cfg.label} />
        ))}
      </Tabs>

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
    </Box>
  );
}
