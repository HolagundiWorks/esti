import {
  Button,
  Checkbox,
  Column,
  Grid,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
  Tile,
} from "@carbon/react";
import {
  ChevronLeft,
  ChevronRight,
} from "@carbon/icons-react";
import {
  ACTIVITY_DOMAIN_TAG,
  activityDomain,
  TASK_CLASSIFICATION_LABEL,
  TASK_LOAD_BAND_LABEL,
  TASK_LOAD_BAND_RANGE,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TaskClassification,
  TaskPriority,
  TaskStatus,
  type TaskLoadBand,
  taskLoadBand,
} from "@esti/contracts";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { ContextualComments } from "../components/ContextualComments.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

// ─── constants ────────────────────────────────────────────────────────────────

const PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red", HIGH: "magenta", MEDIUM: "blue", LOW: "gray",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TAB_SLUGS = ["tasks", "workload", "activity"] as const;
type TabSlug = typeof TAB_SLUGS[number];

// ─── helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function officeBand(total: number, headcount: number): TaskLoadBand {
  const per = headcount > 0 ? total / headcount : total;
  return taskLoadBand(Math.round(per));
}

function formatWhen(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// Heatmap colour scale for calendar cells (Carbon tag-background tokens).
// Sequentially cool → warm: teal → blue → purple → red as load increases.
function heatStyle(n: number): { backgroundColor: string; color: string } {
  if (n === 0)   return { backgroundColor: "transparent",                    color: "var(--cds-text-primary)" };
  if (n <= 2)    return { backgroundColor: "var(--cds-tag-background-teal)", color: "var(--cds-tag-color-teal)" };
  if (n <= 5)    return { backgroundColor: "var(--cds-tag-background-blue)", color: "var(--cds-tag-color-blue)" };
  if (n <= 8)    return { backgroundColor: "var(--cds-tag-background-purple)", color: "var(--cds-tag-color-purple)" };
  return           { backgroundColor: "var(--cds-tag-background-red)",      color: "var(--cds-tag-color-red)" };
}

// ─── WorkloadTab ──────────────────────────────────────────────────────────────

function WorkloadTab() {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(() => toISO(now));
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));

  const dayQ  = trpc.workload.day.useQuery({ date: selectedDate });
  const monthQ = trpc.workload.month.useQuery({ year: view.year, month: view.month });

  const day       = dayQ.data;
  const headcount = day?.headcount ?? 0;
  const total     = day?.total ?? 0;
  const avg       = headcount > 0 ? (total / headcount).toFixed(1) : "—";
  const dayBand   = officeBand(total, headcount);

  const monthHeadcount = monthQ.data?.headcount ?? 0;
  const totalsByDate   = new Map<string, number>();
  for (const d of monthQ.data?.days ?? []) totalsByDate.set(d.date, d.total);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth  = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      if (m < 0)  return { year: v.year - 1, month: 11 };
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  }

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Legend entries for the heatmap scale
  const heatLegend = [
    { label: "No tasks",  style: heatStyle(0),  range: "0" },
    { label: "Light",     style: heatStyle(1),  range: "1–2" },
    { label: "Moderate",  style: heatStyle(3),  range: "3–5" },
    { label: "Heavy",     style: heatStyle(6),  range: "6–8" },
    { label: "Overloaded",style: heatStyle(9),  range: "9+" },
  ];

  return (
    <Grid fullWidth className="esti-dash">
      {/* Legend */}
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={4}>
            <h4>Heatmap scale</h4>
            <Stack orientation="horizontal" gap={5}>
              {heatLegend.map((l) => (
                <Stack key={l.label} orientation="horizontal" gap={3}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 2,
                    backgroundColor: l.style.backgroundColor === "transparent" ? "var(--cds-layer-accent)" : l.style.backgroundColor,
                    border: "1px solid var(--cds-border-subtle)",
                  }} />
                  <Stack gap={1}>
                    <p>{l.label}</p>
                    <p>{l.range} tasks</p>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Tile>
      </Column>

      {/* Calendar */}
      <Column lg={10} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft}
                iconDescription="Previous month" onClick={() => shiftMonth(-1)} />
              <h4 className="esti-grow">{MONTHS[view.month]} {view.year}</h4>
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight}
                iconDescription="Next month" onClick={() => shiftMonth(1)} />
            </Stack>
            <div className="esti-cal">
              {WEEKDAYS.map((w) => (
                <div key={w} style={{ padding: "4px 6px", fontWeight: 600 }}>{w}</div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const cellTotal = totalsByDate.get(iso) ?? 0;
                const heat      = heatStyle(cellTotal > 0 ? officeBand(cellTotal, monthHeadcount) === "light" ? 1 : officeBand(cellTotal, monthHeadcount) === "balanced" ? 4 : 7 : 0);
                const rawHeat   = heatStyle(cellTotal);
                const selected  = iso === selectedDate;
                return (
                  <div
                    key={iso}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(iso)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedDate(iso)}
                    style={{
                      minHeight: 68,
                      padding: "6px 8px",
                      cursor: "pointer",
                      borderRadius: 2,
                      outline: selected ? "2px solid var(--cds-focus)" : "1px solid var(--cds-border-subtle)",
                      backgroundColor: rawHeat.backgroundColor,
                      color: rawHeat.color,
                      transition: "background-color 150ms",
                    }}
                  >
                    <Stack gap={2}>
                      <strong>{d}</strong>
                      {cellTotal > 0 && <span>{cellTotal}</span>}
                    </Stack>
                  </div>
                );
              })}
            </div>
            <p>Open tasks due each day. Darker cell = higher workload.</p>
          </Stack>
        </Tile>
      </Column>

      {/* Day detail */}
      <Column lg={6} md={8} sm={4}>
        <Stack gap={5}>
          <Tile>
            <Stack gap={4}>
              <Stack gap={2}>
                <p>Office — {selectedLabel}</p>
                <h2>{day ? total : "…"} tasks</h2>
              </Stack>
              <Stack orientation="horizontal" gap={4}>
                <Tag type={dayBand === "heavy" ? "red" : dayBand === "balanced" ? "teal" : "green"}>
                  {TASK_LOAD_BAND_LABEL[dayBand]}
                </Tag>
                <p>{headcount} staff · {avg} avg</p>
              </Stack>
            </Stack>
          </Tile>

          <Tile className="esti-fill">
            <Stack gap={4}>
              <h4>Individual workload</h4>
              {day && day.people.length > 0 ? (
                <TableContainer>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Team member</TableHeader>
                        <TableHeader>Tasks</TableHeader>
                        <TableHeader>Status</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {day.people.map((p) => {
                        const band = taskLoadBand(p.count);
                        return (
                          <TableRow key={p.name}>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>{p.count}</TableCell>
                            <TableCell>
                              <Tag type={band === "heavy" ? "red" : band === "balanced" ? "teal" : "green"} size="sm">
                                {TASK_LOAD_BAND_LABEL[band]}
                              </Tag>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <p>No assignees for this day.</p>
              )}
            </Stack>
          </Tile>

          <Tile>
            <Stack gap={3}>
              <h4>Workload bands</h4>
              {(["light", "balanced", "heavy"] as const).map((band) => (
                <Stack key={band} orientation="horizontal" gap={3}>
                  <Tag type={band === "heavy" ? "red" : band === "balanced" ? "teal" : "green"} size="sm">
                    {TASK_LOAD_BAND_LABEL[band]}
                  </Tag>
                  <span className="esti-grow">{TASK_LOAD_BAND_RANGE[band]}</span>
                </Stack>
              ))}
            </Stack>
          </Tile>
        </Stack>
      </Column>
    </Grid>
  );
}

// ─── ActivityTab ──────────────────────────────────────────────────────────────

function ActivityTab() {
  const [visibility, setVisibility] = useState<"STAFF" | "ALL">("STAFF");
  const listQ = trpc.activity.listOffice.useInfiniteQuery(
    { limit: 25, visibility },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const items = listQ.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={5}>
        <div className="esti-grow">
          <p>Office-wide timeline for changes and notes.</p>
        </div>
        <Select id="act-vis" labelText="Visibility" hideLabel size="sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "STAFF" | "ALL")}
        >
          <SelectItem value="STAFF" text="Staff activity" />
          <SelectItem value="ALL" text="All activity" />
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Activity feed unavailable"
          subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading && items.length === 0}
        isEmpty={!listQ.error && items.length === 0}
        columnCount={4}
        empty={{ title: "No activity yet", description: "Project changes and internal notes will appear here." }}
      >
        <Stack gap={4}>
          {items.map((item) => (
            <Tile key={item.id}>
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <Tag type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]} size="sm">
                    {activityDomain(item.eventType)}
                  </Tag>
                  <Tag type="gray" size="sm">{item.eventType}</Tag>
                  <span>{formatWhen(item.createdAt as unknown as string)}</span>
                </Stack>
                <p>{item.summary}</p>
                <p>
                  {item.actorName ?? "System"}
                  {item.projectId && (
                    <> · <Link to={`/projects/${item.projectId}`}>{item.projectRef ?? item.projectTitle ?? "Project"}</Link></>
                  )}
                </p>
              </Stack>
            </Tile>
          ))}
          {listQ.hasNextPage && (
            <Button kind="secondary" disabled={listQ.isFetchingNextPage}
              onClick={() => listQ.fetchNextPage()}>
              {listQ.isFetchingNextPage ? "Loading…" : "Load older"}
            </Button>
          )}
        </Stack>
      </DataState>
    </Stack>
  );
}

// ─── Work (combined module) ───────────────────────────────────────────────────

export function Work() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") ?? "tasks") as TabSlug;
  const tabIndex = Math.max(0, TAB_SLUGS.indexOf(tab));

  // ── task list state ──────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const [openOnly,      setOpenOnly]      = useState(false);
  const [myTasks,       setMyTasks]       = useState(false);
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterPriority,setFilterPriority]= useState("");

  const listQ     = trpc.tasks.list.useQuery({
    openOnly, myTasks,
    status:   filterStatus   ? (filterStatus   as (typeof TaskStatus.options)[number])   : undefined,
    priority: filterPriority ? (filterPriority as (typeof TaskPriority.options)[number]) : undefined,
  });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const invalidate = () => utils.tasks.list.invalidate();
  const update = trpc.tasks.update.useMutation({ onSuccess: invalidate });
  const remove = trpc.tasks.remove.useMutation({ onSuccess: invalidate });

  const [open,         setOpen]         = useState(false);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [commentsTask, setCommentsTask] = useState<{ id: string; projectId: string; title: string } | null>(null);
  const [form, setForm] = useState({
    title: "", projectId: "", assigneeId: "", reviewerId: "",
    classification: "", priority: "MEDIUM", dueDate: "", description: "",
  });
  const teamQ = trpc.assignments.listByProject.useQuery(
    { projectId: form.projectId },
    { enabled: !!form.projectId },
  );
  const team = teamQ.data ?? [];
  const create = trpc.tasks.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ title: "", projectId: "", assigneeId: "", reviewerId: "", classification: "", priority: "MEDIUM", dueDate: "", description: "" });
    },
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={5}>
        <Stack gap={3} className="esti-grow">
          <h1>Work</h1>
          <p>Tasks, workload calendar, and office activity feed.</p>
        </Stack>
        {tabIndex === 0 && (
          <Button onClick={() => setOpen(true)}>New task</Button>
        )}
      </Stack>

      <Tabs
        selectedIndex={tabIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams({ tab: TAB_SLUGS[selectedIndex] ?? "tasks" }, { replace: true })
        }
      >
        <TabList aria-label="Work sections" contained>
          <Tab>Tasks</Tab>
          <Tab>Workload</Tab>
          <Tab>Activity</Tab>
        </TabList>

        <TabPanels>
          {/* ── Tasks ─────────────────────────────────────────────────────── */}
          <TabPanel>
            <Stack gap={5}>
              <Stack orientation="horizontal" gap={5}>
                <Checkbox id="t-open" labelText="Open only" checked={openOnly}
                  onChange={(_e, { checked }) => setOpenOnly(checked)} />
                <Checkbox id="t-mine" labelText="My tasks" checked={myTasks}
                  onChange={(_e, { checked }) => setMyTasks(checked)} />
                <Select id="t-status" labelText="Status" hideLabel size="sm"
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <SelectItem value="" text="All statuses" />
                  {TaskStatus.options.map((s) => (
                    <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                  ))}
                </Select>
                <Select id="t-prio" labelText="Priority" hideLabel size="sm"
                  value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <SelectItem value="" text="All priorities" />
                  {TaskPriority.options.map((p) => (
                    <SelectItem key={p} value={p} text={TASK_PRIORITY_LABEL[p] ?? p} />
                  ))}
                </Select>
              </Stack>

              <DataState
                loading={listQ.isLoading}
                isEmpty={(listQ.data ?? []).length === 0}
                columnCount={8}
                empty={{
                  title: openOnly || myTasks ? "No matching tasks" : "No tasks yet",
                  description: "Create a task to track work across the office and projects.",
                  action: <Button size="sm" onClick={() => setOpen(true)}>New task</Button>,
                }}
              >
                <TableContainer title="Task list">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Task</TableHeader>
                        <TableHeader>Project</TableHeader>
                        <TableHeader>Assignee</TableHeader>
                        <TableHeader>Reviewer</TableHeader>
                        <TableHeader>Priority</TableHeader>
                        <TableHeader>Due</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Comments</TableHeader>
                        <TableHeader></TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(listQ.data ?? []).map((t) => {
                        const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                        return (
                          <TableRow key={t.id}>
                            <TableCell>
                              {t.title}
                              {t.description && <div>{t.description}</div>}
                              {t.classification && (
                                <Tag type="cool-gray" size="sm">
                                  {TASK_CLASSIFICATION_LABEL[t.classification] ?? t.classification}
                                </Tag>
                              )}
                            </TableCell>
                            <TableCell>
                              {t.projectId
                                ? <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>
                                : "—"}
                            </TableCell>
                            <TableCell>{t.assignee ?? "—"}</TableCell>
                            <TableCell>{"—"}</TableCell>
                            <TableCell>
                              <Tag type={PRIORITY_TAG[t.priority] ?? "gray"}>
                                {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                              </Tag>
                            </TableCell>
                            <TableCell>
                              {overdue
                                ? <Tag type="red">Overdue · {t.dueDate}</Tag>
                                : (t.dueDate ?? "—")}
                            </TableCell>
                            <TableCell>
                              <Select id={`ts-${t.id}`} labelText="Status" hideLabel size="sm"
                                value={t.status}
                                onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}>
                                {TaskStatus.options.map((s) => (
                                  <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell>
                              {t.projectId ? (
                                <Button kind="ghost" size="sm"
                                  onClick={() => setCommentsTask({ id: t.id, projectId: t.projectId ?? "", title: t.title })}>
                                  Comments
                                </Button>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(t.id)}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DataState>
            </Stack>
          </TabPanel>

          {/* ── Workload ──────────────────────────────────────────────────── */}
          <TabPanel>
            <WorkloadTab />
          </TabPanel>

          {/* ── Activity ──────────────────────────────────────────────────── */}
          <TabPanel>
            <ActivityTab />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!confirmId} heading="Remove task?" body="This permanently removes the task."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={open} modalHeading="New task"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.title || !form.projectId || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({
          title: form.title, projectId: form.projectId,
          assigneeId: form.assigneeId || null,
          reviewerId: form.reviewerId || null,
          classification: form.classification ? (form.classification as (typeof TaskClassification.options)[number]) : undefined,
          priority: form.priority as (typeof TaskPriority.options)[number],
          dueDate: form.dueDate || null,
          description: form.description || undefined,
        })}
      >
        <Stack gap={5}>
          <TextInput id="nt-title" labelText="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select id="nt-proj" labelText="Project" value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeId: "", reviewerId: "" }))}>
            <SelectItem value="" text="— select a project —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={5}>
            <Select id="nt-assignee" labelText="Assignee"
              disabled={!form.projectId || team.length === 0}
              helperText={!form.projectId ? "Select a project first" : team.length === 0 ? "No team members yet" : undefined}
              value={form.assigneeId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
              <SelectItem value="" text="— unassigned —" />
              {team.map((m) => <SelectItem key={m.teamMemberId} value={m.teamMemberId} text={`${m.name} (${m.role})`} />)}
            </Select>
            <Select id="nt-reviewer" labelText="Reviewer"
              disabled={!form.projectId || team.length === 0}
              value={form.reviewerId}
              onChange={(e) => setForm((f) => ({ ...f, reviewerId: e.target.value }))}>
              <SelectItem value="" text="— none —" />
              {team.map((m) => <SelectItem key={m.teamMemberId} value={m.teamMemberId} text={`${m.name} (${m.role})`} />)}
            </Select>
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <Select id="nt-prio" labelText="Priority" value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {TaskPriority.options.map((p) => (
                <SelectItem key={p} value={p} text={TASK_PRIORITY_LABEL[p] ?? p} />
              ))}
            </Select>
            <Select id="nt-class" labelText="Classification" value={form.classification}
              onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}>
              <SelectItem value="" text="— none —" />
              {TaskClassification.options.map((c) => (
                <SelectItem key={c} value={c} text={TASK_CLASSIFICATION_LABEL[c] ?? c} />
              ))}
            </Select>
            <TextInput id="nt-due" labelText="Due date" type="date" value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Stack>
          <TextArea id="nt-desc" labelText="Description (optional)" rows={2} value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Stack>
      </Modal>

      <Modal
        open={commentsTask !== null}
        modalHeading={commentsTask ? `Task comments — ${commentsTask.title}` : "Task comments"}
        primaryButtonText="Close" secondaryButtonText="" passiveModal
        onRequestClose={() => setCommentsTask(null)}
      >
        {commentsTask && (
          <ContextualComments projectId={commentsTask.projectId} objectType="task"
            objectId={commentsTask.id} heading="Task comments"
            description="Contextual discussion linked directly to this task." />
        )}
      </Modal>
    </Stack>
  );
}
