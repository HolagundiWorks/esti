import {
  Button,
  Column,
  ClickableTile,
  Grid,
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
  Tile,
  TextArea,
  TextInput,
} from "@carbon/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DECISION_STATE_LABEL,
  DECISION_STATE_TAG,
  DECISION_TRANSITIONS,
  DecisionState,
  REVISION_CATEGORY_LABEL,
  REVISION_CATEGORY_TAG,
  RevisionCategory,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

function StatCard({
  label,
  value,
  detail,
  onClick,
  tag,
}: {
  label: string;
  value: string | number;
  detail: string;
  onClick?: () => void;
  tag: string;
}) {
  const body = (
    <Stack gap={3}>
      <Stack gap={2}>
        <h4>{label}</h4>
        <h2>{value}</h2>
      </Stack>
      <Tag type="blue">{tag}</Tag>
      <p>{detail}</p>
    </Stack>
  );
  return onClick ? (
    <ClickableTile onClick={onClick}>
      {body}
    </ClickableTile>
  ) : (
    <Tile>{body}</Tile>
  );
}

function daysAgo(dateStr: string | Date): number {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function ProjectOverview({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const tasksQ = trpc.tasks.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const approvalsQ = trpc.approvals.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const drawingsQ = trpc.drawings.listByProject.useQuery(
    { projectId, currentOnly: true },
    { enabled: !!projectId },
  );
  const revisionsQ = trpc.drawings.recentRevisions.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const notesQ = trpc.criticalNotes.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const decisionsQ = trpc.decisions.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const activityQ = trpc.activity.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const complianceQ = trpc.bylawCalc.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const [noteOpen, setNoteOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [transitionId, setTransitionId] = useState<string | null>(null);
  const [toState, setToState] = useState<DecisionState>("OPEN");

  const [note, setNote] = useState({
    title: "",
    category: "Change control",
    priority: "MEDIUM",
    status: "OPEN",
    owner: "",
    dueDate: "",
    body: "",
  });
  const [decision, setDecision] = useState({
    title: "",
    rationale: "",
    state: "DRAFT" as DecisionState,
    revisionCategory: "" as RevisionCategory | "",
    impact: "LOW",
    ownerName: "",
    linkedObjectType: "",
    linkedObjectId: "",
  });

  const noteCreate = trpc.criticalNotes.create.useMutation({
    onSuccess: async () => {
      setNoteOpen(false);
      setNote({
        title: "",
        category: "Change control",
        priority: "MEDIUM",
        status: "OPEN",
        owner: "",
        dueDate: "",
        body: "",
      });
      await utils.criticalNotes.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });
  const decisionCreate = trpc.decisions.create.useMutation({
    onSuccess: async () => {
      setDecisionOpen(false);
      setDecision({
        title: "",
        rationale: "",
        state: "DRAFT",
        revisionCategory: "",
        impact: "LOW",
        ownerName: "",
        linkedObjectType: "",
        linkedObjectId: "",
      });
      await utils.decisions.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });
  const decisionTransition = trpc.decisions.transition.useMutation({
    onSuccess: async () => {
      setTransitionId(null);
      await utils.decisions.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });

  const tasks = tasksQ.data ?? [];
  const approvals = approvalsQ.data ?? [];
  const drawings = drawingsQ.data ?? [];
  const revisions = revisionsQ.data ?? [];
  const notes = notesQ.data ?? [];
  const allDecisions = decisionsQ.data ?? [];
  const openTasks = tasks.filter((t) => t.status !== "DONE");
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate < new Date().toISOString().slice(0, 10) &&
      t.status !== "DONE",
  );
  const pendingApprovals = approvals.filter(
    (a) =>
      a.status === "DRAFT" || a.status === "SENT" || a.status === "REVISIONS",
  );
  const openNotes = notes.filter((n) => n.status !== "RESOLVED");
  const activeDecisions = allDecisions.filter(
    (d) => d.state !== "LOCKED" && d.state !== "ACCEPTED",
  );
  const health = [
    openTasks.length > 0 ? "Tasks open" : null,
    overdueTasks.length > 0 ? "Tasks overdue" : null,
    pendingApprovals.length > 0 ? "Approvals pending" : null,
    openNotes.length > 0 ? "Critical notes open" : null,
    activeDecisions.length > 0 ? "Decisions in progress" : null,
  ].filter(Boolean);
  const compliance = complianceQ.data?.result as
    | { far?: number; maxBuiltUpSqm?: number; maxFootprintSqm?: number }
    | undefined;

  const transitionDecision = allDecisions.find((d) => d.id === transitionId);
  const allowedNextStates = transitionDecision
    ? DECISION_TRANSITIONS[(transitionDecision.state ?? "OPEN") as DecisionState] ?? []
    : [];

  return (
    <Stack gap={7}>
      <Grid condensed>
        <Column sm={4} md={4} lg={4}>
          <StatCard
            label="Open tasks"
            value={openTasks.length}
            detail="Work items still in motion."
            tag="Task load"
            onClick={() => navigate("/tasks")}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatCard
            label="Pending approvals"
            value={pendingApprovals.length}
            detail="Items waiting for client or internal sign-off."
            tag="Approvals"
            onClick={() => navigate("/activity")}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatCard
            label="Current drawings"
            value={drawings.length}
            detail="Latest drawing revisions in active use."
            tag="Revisions"
            onClick={() => navigate(`/projects/${projectId}?tab=drawings`)}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatCard
            label="Health signals"
            value={health.length}
            detail={
              health.length
                ? health.join(" · ")
                : "No obvious blockers right now."
            }
            tag="Overview"
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatCard
            label="Compliance output"
            value={
              compliance
                ? `FAR ${compliance.far?.toFixed(2) ?? "—"}`
                : "Not calculated"
            }
            detail={
              compliance
                ? `${compliance.maxBuiltUpSqm ?? "—"} sq m FAR area · ${compliance.maxFootprintSqm ?? "—"} sq m ground cover`
                : "Run the standalone compliance calculator for this project."
            }
            tag="Linked result"
            onClick={() => navigate(`/compliance?project=${projectId}`)}
          />
        </Column>
      </Grid>

      {revisions.length > 0 && (
        <TableContainer
          title="Drawing revision feed"
          description="All superseded drawing versions for this project"
        >
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Drawing</TableHeader>
                <TableHeader>Rev</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Note</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {revisions.slice(0, 10).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>
                    <Tag type="gray" size="sm">
                      Rev {r.revNo}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    {new Date(r.createdAt as unknown as string).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>{r.revisionNote ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Critical notes</h3>
            <Button size="sm" onClick={() => setNoteOpen(true)}>
              Add note
            </Button>
          </div>
          <TableContainer
            title="Critical notes"
            description="Categories, owners, due dates, and status"
          >
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Note</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Owner</TableHeader>
                  <TableHeader>Due</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {notes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>No critical notes yet.</TableCell>
                  </TableRow>
                )}
                {notes.slice(0, 5).map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.title}</TableCell>
                    <TableCell>{n.category}</TableCell>
                    <TableCell>{n.owner ?? "—"}</TableCell>
                    <TableCell>{n.dueDate ?? "—"}</TableCell>
                    <TableCell>
                      <Tag
                        type={
                          n.status === "RESOLVED"
                            ? "green"
                            : n.status === "BLOCKED"
                              ? "red"
                              : "blue"
                        }
                        size="sm"
                      >
                        {n.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Column>
        <Column sm={4} md={8} lg={8}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Decision ledger</h3>
            <Button size="sm" onClick={() => setDecisionOpen(true)}>
              Add decision
            </Button>
          </div>
          <TableContainer
            title="Decision ledger"
            description="CRIF state machine: rationale, category, owner, and transitions"
          >
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Decision</TableHeader>
                  <TableHeader>State</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Impact</TableHeader>
                  <TableHeader>Days open</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {allDecisions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No decisions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {allDecisions.slice(0, 8).map((d) => {
                  const state = (d.state ?? "OPEN") as DecisionState;
                  const cat = d.revisionCategory as RevisionCategory | null;
                  const days = daysAgo(d.createdAt as unknown as string);
                  const canTransition =
                    (DECISION_TRANSITIONS[state] ?? []).length > 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>
                        <Tag type={DECISION_STATE_TAG[state]} size="sm">
                          {DECISION_STATE_LABEL[state]}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        {cat ? (
                          <Tag type={REVISION_CATEGORY_TAG[cat]} size="sm">
                            {REVISION_CATEGORY_LABEL[cat]}
                          </Tag>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{d.impact}</TableCell>
                      <TableCell>{days}d</TableCell>
                      <TableCell>
                        {canTransition && (
                          <Button
                            kind="ghost"
                            size="sm"
                            onClick={() => {
                              setTransitionId(d.id);
                              setToState(
                                (DECISION_TRANSITIONS[state] ?? [])[0] ?? "OPEN",
                              );
                            }}
                          >
                            Transition
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Column>
      </Grid>

      <TableContainer
        title="Recent activity"
        description="Latest timeline entries for this project"
      >
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>When</TableHeader>
              <TableHeader>What</TableHeader>
              <TableHeader>Summary</TableHeader>
              <TableHeader>Actor</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(activityQ.data ?? []).slice(0, 8).map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {new Date(item.createdAt as unknown as string).toLocaleString(
                    "en-IN",
                  )}
                </TableCell>
                <TableCell>{item.eventType}</TableCell>
                <TableCell>{item.summary}</TableCell>
                <TableCell>{item.actorName ?? "System"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add critical note modal */}
      <Modal
        open={noteOpen}
        modalHeading="Add critical note"
        primaryButtonText={noteCreate.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!note.title || noteCreate.isPending}
        onRequestClose={() => setNoteOpen(false)}
        onRequestSubmit={() =>
          noteCreate.mutate({
            projectId,
            title: note.title,
            category: note.category,
            priority: note.priority as "LOW" | "MEDIUM" | "HIGH",
            status: note.status as "OPEN" | "BLOCKED" | "RESOLVED",
            visibility: "STAFF",
            owner: note.owner || undefined,
            dueDate: note.dueDate || null,
            body: note.body || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="cn-title"
            labelText="Title"
            value={note.title}
            onChange={(e) => setNote((f) => ({ ...f, title: e.target.value }))}
          />
          <TextInput
            id="cn-category"
            labelText="Category"
            value={note.category}
            onChange={(e) =>
              setNote((f) => ({ ...f, category: e.target.value }))
            }
          />
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="cn-priority"
              labelText="Priority"
              value={note.priority}
              onChange={(e) =>
                setNote((f) => ({ ...f, priority: e.target.value }))
              }
            >
              {["LOW", "MEDIUM", "HIGH"].map((p) => (
                <SelectItem key={p} value={p} text={p} />
              ))}
            </Select>
            <Select
              id="cn-status"
              labelText="Status"
              value={note.status}
              onChange={(e) =>
                setNote((f) => ({ ...f, status: e.target.value }))
              }
            >
              {["OPEN", "BLOCKED", "RESOLVED"].map((s) => (
                <SelectItem key={s} value={s} text={s} />
              ))}
            </Select>
          </Stack>
          <TextInput
            id="cn-owner"
            labelText="Owner (optional)"
            value={note.owner}
            onChange={(e) => setNote((f) => ({ ...f, owner: e.target.value }))}
          />
          <TextInput
            id="cn-due"
            labelText="Due date (optional)"
            type="date"
            value={note.dueDate}
            onChange={(e) =>
              setNote((f) => ({ ...f, dueDate: e.target.value }))
            }
          />
          <TextArea
            id="cn-body"
            labelText="Details (optional)"
            rows={3}
            value={note.body}
            onChange={(e) => setNote((f) => ({ ...f, body: e.target.value }))}
          />
        </Stack>
      </Modal>

      {/* Add decision modal */}
      <Modal
        open={decisionOpen}
        modalHeading="Add decision"
        primaryButtonText={decisionCreate.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !decision.title || !decision.rationale || decisionCreate.isPending
        }
        onRequestClose={() => setDecisionOpen(false)}
        onRequestSubmit={() =>
          decisionCreate.mutate({
            projectId,
            title: decision.title,
            rationale: decision.rationale,
            state: decision.state,
            revisionCategory: decision.revisionCategory || undefined,
            impact: decision.impact as "LOW" | "MEDIUM" | "HIGH",
            ownerName: decision.ownerName || undefined,
            linkedObjectType: decision.linkedObjectType || undefined,
            linkedObjectId: decision.linkedObjectId || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="dc-title"
            labelText="Decision title"
            value={decision.title}
            onChange={(e) =>
              setDecision((f) => ({ ...f, title: e.target.value }))
            }
          />
          <TextArea
            id="dc-rationale"
            labelText="Rationale"
            rows={3}
            value={decision.rationale}
            onChange={(e) =>
              setDecision((f) => ({ ...f, rationale: e.target.value }))
            }
          />
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="dc-state"
              labelText="State"
              value={decision.state}
              onChange={(e) =>
                setDecision((f) => ({
                  ...f,
                  state: e.target.value as DecisionState,
                }))
              }
            >
              {DecisionState.options.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  text={DECISION_STATE_LABEL[s]}
                />
              ))}
            </Select>
            <Select
              id="dc-category"
              labelText="Revision category"
              value={decision.revisionCategory}
              onChange={(e) =>
                setDecision((f) => ({
                  ...f,
                  revisionCategory: e.target.value as RevisionCategory | "",
                }))
              }
            >
              <SelectItem value="" text="None" />
              {RevisionCategory.options.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  text={REVISION_CATEGORY_LABEL[c]}
                />
              ))}
            </Select>
            <Select
              id="dc-impact"
              labelText="Impact"
              value={decision.impact}
              onChange={(e) =>
                setDecision((f) => ({ ...f, impact: e.target.value }))
              }
            >
              {["LOW", "MEDIUM", "HIGH"].map((s) => (
                <SelectItem key={s} value={s} text={s} />
              ))}
            </Select>
          </Stack>
          <TextInput
            id="dc-owner"
            labelText="Owner (optional)"
            value={decision.ownerName}
            onChange={(e) =>
              setDecision((f) => ({ ...f, ownerName: e.target.value }))
            }
          />
          <Stack orientation="horizontal" gap={5}>
            <TextInput
              id="dc-linktype"
              labelText="Linked object type (optional)"
              value={decision.linkedObjectType}
              onChange={(e) =>
                setDecision((f) => ({
                  ...f,
                  linkedObjectType: e.target.value,
                }))
              }
            />
            <TextInput
              id="dc-linkid"
              labelText="Linked object ID (optional)"
              value={decision.linkedObjectId}
              onChange={(e) =>
                setDecision((f) => ({ ...f, linkedObjectId: e.target.value }))
              }
            />
          </Stack>
        </Stack>
      </Modal>

      {/* CRIF state transition modal */}
      <Modal
        open={!!transitionId}
        modalHeading={`Transition: ${transitionDecision?.title ?? ""}`}
        primaryButtonText={decisionTransition.isPending ? "Transitioning…" : "Confirm transition"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={decisionTransition.isPending}
        onRequestClose={() => setTransitionId(null)}
        onRequestSubmit={() => {
          if (!transitionId) return;
          decisionTransition.mutate({ id: transitionId, toState });
        }}
      >
        <Stack gap={5}>
          <p>
            Current state:{" "}
            <Tag
              type={
                DECISION_STATE_TAG[
                  (transitionDecision?.state ?? "OPEN") as DecisionState
                ]
              }
              size="sm"
            >
              {
                DECISION_STATE_LABEL[
                  (transitionDecision?.state ?? "OPEN") as DecisionState
                ]
              }
            </Tag>
          </p>
          <Select
            id="tr-tostate"
            labelText="Move to"
            value={toState}
            onChange={(e) => setToState(e.target.value as DecisionState)}
          >
            {allowedNextStates.map((s) => (
              <SelectItem key={s} value={s} text={DECISION_STATE_LABEL[s]} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </Stack>
  );
}
