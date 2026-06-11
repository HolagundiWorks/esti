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
    approval: "PENDING",
    impact: "LOW",
    status: "OPEN",
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
        approval: "PENDING",
        impact: "LOW",
        status: "OPEN",
        linkedObjectType: "",
        linkedObjectId: "",
      });
      await utils.decisions.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });

  const tasks = tasksQ.data ?? [];
  const approvals = approvalsQ.data ?? [];
  const drawings = drawingsQ.data ?? [];
  const notes = notesQ.data ?? [];
  const decisions = decisionsQ.data ?? [];
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
  const openDecisions = decisions.filter((d) => d.status === "OPEN");
  const health = [
    openTasks.length > 0 ? "Tasks open" : null,
    overdueTasks.length > 0 ? "Tasks overdue" : null,
    pendingApprovals.length > 0 ? "Approvals pending" : null,
    openNotes.length > 0 ? "Critical notes open" : null,
    openDecisions.length > 0 ? "Decisions open" : null,
  ].filter(Boolean);
  const compliance = complianceQ.data?.result as
    | { far?: number; maxBuiltUpSqm?: number; maxFootprintSqm?: number }
    | undefined;

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
            <h3>Decision register</h3>
            <Button size="sm" onClick={() => setDecisionOpen(true)}>
              Add decision
            </Button>
          </div>
          <TableContainer
            title="Decision register"
            description="Rationale, approval, impact, and link targets"
          >
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Decision</TableHeader>
                  <TableHeader>Approval</TableHeader>
                  <TableHeader>Impact</TableHeader>
                  <TableHeader>Linked to</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {decisions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      No decisions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {decisions.slice(0, 5).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>
                      <Tag
                        type={
                          d.approval === "APPROVED"
                            ? "green"
                            : d.approval === "REJECTED"
                              ? "red"
                              : "gray"
                        }
                        size="sm"
                      >
                        {d.approval}
                      </Tag>
                    </TableCell>
                    <TableCell>{d.impact}</TableCell>
                    <TableCell>
                      {d.linkedObjectType
                        ? `${d.linkedObjectType}${d.linkedObjectId ? ` · ${d.linkedObjectId}` : ""}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
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
            {(activityQ.data ?? []).slice(0, 5).map((item) => (
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
          <div style={{ display: "flex", gap: 12 }}>
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
          </div>
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
            approval: decision.approval as
              | "PENDING"
              | "APPROVED"
              | "REJECTED"
              | "NEEDS_REVISION",
            impact: decision.impact as "LOW" | "MEDIUM" | "HIGH",
            status: decision.status as "OPEN" | "CLOSED",
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
          <div style={{ display: "flex", gap: 12 }}>
            <Select
              id="dc-approval"
              labelText="Approval"
              value={decision.approval}
              onChange={(e) =>
                setDecision((f) => ({ ...f, approval: e.target.value }))
              }
            >
              {["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"].map(
                (s) => (
                  <SelectItem key={s} value={s} text={s} />
                ),
              )}
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
            <Select
              id="dc-status"
              labelText="Status"
              value={decision.status}
              onChange={(e) =>
                setDecision((f) => ({ ...f, status: e.target.value }))
              }
            >
              {["OPEN", "CLOSED"].map((s) => (
                <SelectItem key={s} value={s} text={s} />
              ))}
            </Select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="dc-linktype"
              labelText="Linked object type (optional)"
              value={decision.linkedObjectType}
              onChange={(e) =>
                setDecision((f) => ({ ...f, linkedObjectType: e.target.value }))
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
          </div>
        </Stack>
      </Modal>
    </Stack>
  );
}
