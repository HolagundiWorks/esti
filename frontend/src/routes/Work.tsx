import {
  Button,
  Checkbox,
  Column,
  Grid,
  InlineNotification,
  Modal,
  NumberInput,
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
  Toggle,
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
  TASK_WORK_TYPE_LABEL,
  TaskClassification,
  TaskPriority,
  TaskStatus,
  TaskWorkType,
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

const TAB_SLUGS = ["tasks", "board", "workload", "activity", "standup", "timesheets"] as const;
type TabSlug = typeof TAB_SLUGS[number];

// Board column order + accent tag per status.
const BOARD_COLUMNS: { status: (typeof TaskStatus.options)[number]; tag: "gray" | "blue" | "red" | "green" }[] = [
  { status: "TODO",        tag: "gray" },
  { status: "IN_PROGRESS", tag: "blue" },
  { status: "BLOCKED",     tag: "red" },
  { status: "DONE",        tag: "green" },
];

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
                  <div
                    className="esti-heat-swatch"
                    style={{ backgroundColor: l.style.backgroundColor === "transparent" ? "var(--cds-layer-accent)" : l.style.backgroundColor }}
                  />
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
                <div key={w} className="esti-cal-hdr">{w}</div>
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
                    className="esti-cal-cell"
                    style={{
                      outline: selected ? "2px solid var(--cds-focus)" : "1px solid var(--cds-border-subtle)",
                      backgroundColor: rawHeat.backgroundColor,
                      color: rawHeat.color,
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

// ─── StandupTab ───────────────────────────────────────────────────────────────

function StandupTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ completed: "", inProgress: "", blockers: "" });
  const [date, setDate] = useState(today);

  const todayQ = trpc.dailyUpdates.today.useQuery({ date });
  const listQ  = trpc.dailyUpdates.list.useQuery({ myOnly: false, dateFrom: date, dateTo: date });
  const utils  = trpc.useUtils();

  const upsert = trpc.dailyUpdates.upsertMine.useMutation({
    onSuccess: () => {
      utils.dailyUpdates.today.invalidate();
      utils.dailyUpdates.list.invalidate();
    },
  });

  const mine = todayQ.data;

  return (
    <Grid>
      <Column sm={4} md={4} lg={6}>
        <Tile>
          <Stack gap={5}>
            <Stack gap={2}>
              <h4>My stand-up</h4>
              <TextInput id="su-date" labelText="Date" type="date" value={date}
                onChange={(e) => setDate(e.target.value)} />
            </Stack>
            {mine && (
              <Stack gap={2}>
                <Tag type="teal" size="sm">Saved</Tag>
                {mine.completed && <><p><strong>Completed:</strong></p><p>{mine.completed}</p></>}
                {mine.inProgress && <><p><strong>In progress:</strong></p><p>{mine.inProgress}</p></>}
                {mine.blockers && <><p><strong>Blockers:</strong></p><p>{mine.blockers}</p></>}
              </Stack>
            )}
            <Stack gap={4}>
              <TextArea id="su-done" labelText="Completed yesterday" rows={2} value={form.completed}
                onChange={(e) => setForm((f) => ({ ...f, completed: e.target.value }))} />
              <TextArea id="su-today" labelText="In progress today" rows={2} value={form.inProgress}
                onChange={(e) => setForm((f) => ({ ...f, inProgress: e.target.value }))} />
              <TextArea id="su-block" labelText="Blockers" rows={2} value={form.blockers}
                onChange={(e) => setForm((f) => ({ ...f, blockers: e.target.value }))} />
              <Button
                disabled={upsert.isPending}
                onClick={() => upsert.mutate({ updateDate: date, ...form })}
              >
                {upsert.isPending ? "Saving…" : mine ? "Update" : "Post stand-up"}
              </Button>
            </Stack>
          </Stack>
        </Tile>
      </Column>

      <Column sm={4} md={4} lg={10}>
        <Tile>
          <Stack gap={4}>
            <h4>Team stand-ups — {date}</h4>
            <DataState
              loading={listQ.isLoading}
              isEmpty={(listQ.data ?? []).length === 0}
              columnCount={2}
              empty={{ title: "No stand-ups for this date", description: "Stand-ups posted by team members will appear here." }}
            >
              <Stack gap={4}>
                {(listQ.data ?? []).map((u) => (
                  <Tile key={u.id}>
                    <Stack gap={3}>
                      <Stack orientation="horizontal" gap={3}>
                        <Tag type="blue" size="sm">{u.memberName ?? "Team member"}</Tag>
                        <Tag type="gray" size="sm">{u.updateDate}</Tag>
                      </Stack>
                      {u.completed   && <p><strong>Done:</strong> {u.completed}</p>}
                      {u.inProgress  && <p><strong>Today:</strong> {u.inProgress}</p>}
                      {u.blockers    && <p><strong>Blockers:</strong> {u.blockers}</p>}
                    </Stack>
                  </Tile>
                ))}
              </Stack>
            </DataState>
          </Stack>
        </Tile>
      </Column>
    </Grid>
  );
}

// ─── TimesheetsTab ────────────────────────────────────────────────────────────

function TimesheetsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [myOnly, setMyOnly] = useState(true);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo]     = useState(today);
  const [tsOpen, setTsOpen]     = useState(false);
  const [tsForm, setTsForm]     = useState({
    projectId: "", taskId: "", entryDate: today, hours: "8", billable: false, description: "",
  });

  const listQ     = trpc.timesheets.list.useQuery({ myOnly, dateFrom, dateTo });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const utils     = trpc.useUtils();

  const tasksByProject = trpc.tasks.listByProject.useQuery(
    { projectId: tsForm.projectId },
    { enabled: !!tsForm.projectId },
  );

  const myScoreQ = trpc.aspRf.myScore.useQuery();
  const selfMemberId = myScoreQ.data?.teamMemberId ?? "";

  const invalidate = () => utils.timesheets.list.invalidate();
  const createTs = trpc.timesheets.create.useMutation({
    onSuccess: () => { invalidate(); setTsOpen(false); setTsForm({ projectId: "", taskId: "", entryDate: today, hours: "8", billable: false, description: "" }); },
  });
  const removeTs = trpc.timesheets.remove.useMutation({ onSuccess: invalidate });

  const rows = listQ.data ?? [];
  const totalHours = rows.reduce((s, r) => s + Number(r.hours), 0);

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={5}>
        <Checkbox id="ts-mine" labelText="My timesheets" checked={myOnly}
          onChange={(_e, { checked }) => setMyOnly(checked)} />
        <TextInput id="ts-from" labelText="From" type="date" value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)} />
        <TextInput id="ts-to" labelText="To" type="date" value={dateTo}
          onChange={(e) => setDateTo(e.target.value)} />
        <div className="esti-grow" />
        <Button size="sm" onClick={() => setTsOpen(true)}>Log hours</Button>
      </Stack>

      {rows.length > 0 && (
        <Stack orientation="horizontal" gap={3}>
          <Tag type="teal">{totalHours.toFixed(1)} hrs logged</Tag>
          <Tag type="blue">{rows.filter((r) => r.billable).reduce((s, r) => s + Number(r.hours), 0).toFixed(1)} hrs billable</Tag>
        </Stack>
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No timesheet entries", description: "Log hours against projects and tasks." }}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Member</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Task</TableHeader>
                <TableHeader>Hours</TableHeader>
                <TableHeader>Billable</TableHeader>
                <TableHeader>Note</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.entryDate}</TableCell>
                  <TableCell>{r.memberName ?? "—"}</TableCell>
                  <TableCell>{r.projectRef ?? r.projectTitle ?? "—"}</TableCell>
                  <TableCell>{r.taskTitle ?? "—"}</TableCell>
                  <TableCell>{Number(r.hours).toFixed(1)}</TableCell>
                  <TableCell>
                    {r.billable ? <Tag type="teal" size="sm">Billable</Tag> : <Tag type="gray" size="sm">Non-billable</Tag>}
                  </TableCell>
                  <TableCell>{r.description ?? "—"}</TableCell>
                  <TableCell>
                    <Button kind="danger--ghost" size="sm" onClick={() => removeTs.mutate({ id: r.id })}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={tsOpen} modalHeading="Log hours"
        primaryButtonText={createTs.isPending ? "Saving…" : "Log"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!tsForm.projectId || !tsForm.hours || !selfMemberId || createTs.isPending}
        onRequestClose={() => setTsOpen(false)}
        onRequestSubmit={() => createTs.mutate({
          teamMemberId: selfMemberId,
          projectId: tsForm.projectId || undefined,
          taskId: tsForm.taskId || undefined,
          entryDate: tsForm.entryDate,
          hours: parseFloat(tsForm.hours),
          billable: tsForm.billable,
          description: tsForm.description || undefined,
        })}
      >
        <Stack gap={5}>
          <TextInput id="ts-date" labelText="Date" type="date" value={tsForm.entryDate}
            onChange={(e) => setTsForm((f) => ({ ...f, entryDate: e.target.value }))} />
          <Select id="ts-proj" labelText="Project" value={tsForm.projectId}
            onChange={(e) => setTsForm((f) => ({ ...f, projectId: e.target.value, taskId: "" }))}>
            <SelectItem value="" text="— select a project —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />
            ))}
          </Select>
          <Select id="ts-task" labelText="Task (optional)" value={tsForm.taskId}
            disabled={!tsForm.projectId}
            onChange={(e) => setTsForm((f) => ({ ...f, taskId: e.target.value }))}>
            <SelectItem value="" text="— no task —" />
            {(tasksByProject.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.title} />
            ))}
          </Select>
          <TextInput id="ts-hrs-inp" labelText="Hours" type="number" value={tsForm.hours}
            onChange={(e) => setTsForm((f) => ({ ...f, hours: e.target.value }))} />
          <Toggle id="ts-bill" labelText="Billable" labelA="No" labelB="Yes"
            toggled={tsForm.billable}
            onToggle={(val) => setTsForm((f) => ({ ...f, billable: val }))} />
          <TextArea id="ts-note" labelText="Note (optional)" rows={2} value={tsForm.description}
            onChange={(e) => setTsForm((f) => ({ ...f, description: e.target.value }))} />
          {!selfMemberId && (
            <InlineNotification kind="warning" title="No team member profile found"
              subtitle="Ask an admin to link your user account to a team member." hideCloseButton lowContrast />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}

// ─── TaskBoardTab ─────────────────────────────────────────────────────────────

function TaskBoardTab() {
  const utils = trpc.useUtils();
  const [myTasks, setMyTasks] = useState(false);
  const listQ = trpc.tasks.list.useQuery({ myTasks });
  const update = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.list.invalidate() });
  const today = new Date().toISOString().slice(0, 10);

  const tasks = listQ.data ?? [];
  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={5}>
        <div className="esti-grow">
          <p>Drag-free status board — move a task with its column menu.</p>
        </div>
        <Checkbox id="b-mine" labelText="My tasks" checked={myTasks}
          onChange={(_e, { checked }) => setMyTasks(checked)} />
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={tasks.length === 0}
        columnCount={4}
        empty={{ title: "No tasks", description: "Create a task on the Tasks tab to see it on the board." }}
      >
        <Grid fullWidth>
          {BOARD_COLUMNS.map(({ status, tag }) => {
            const colTasks = byStatus(status);
            return (
              <Column key={status} sm={4} md={2} lg={4}>
                <Stack gap={4}>
                  <Stack orientation="horizontal" gap={3}>
                    <Tag type={tag}>{TASK_STATUS_LABEL[status] ?? status}</Tag>
                    <span className="esti-label esti-label--secondary">{colTasks.length}</span>
                  </Stack>
                  {colTasks.length === 0 ? (
                    <p className="esti-label esti-label--helper">No tasks</p>
                  ) : (
                    colTasks.map((t) => {
                      const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                      return (
                        <Tile key={t.id}>
                          <Stack gap={3}>
                            <strong>{t.title}</strong>
                            <Stack orientation="horizontal" gap={3}>
                              <Tag type={PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                                {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                              </Tag>
                              {t.projectId && (
                                <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>
                              )}
                            </Stack>
                            {t.assignee && (
                              <span className="esti-label esti-label--secondary">{t.assignee}</span>
                            )}
                            {t.dueDate && (
                              overdue
                                ? <Tag type="red" size="sm">Overdue · {t.dueDate}</Tag>
                                : <span className="esti-label esti-label--helper">Due {t.dueDate}</span>
                            )}
                            <Select id={`bs-${t.id}`} labelText="Move to" hideLabel size="sm"
                              value={t.status}
                              onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}>
                              {TaskStatus.options.map((s) => (
                                <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                              ))}
                            </Select>
                          </Stack>
                        </Tile>
                      );
                    })
                  )}
                </Stack>
              </Column>
            );
          })}
        </Grid>
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
    classification: "", workType: "", priority: "MEDIUM",
    dueDate: "", description: "", difficultyCoefficient: "3", estimatedHours: "",
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
      setForm({ title: "", projectId: "", assigneeId: "", reviewerId: "", classification: "", workType: "", priority: "MEDIUM", dueDate: "", description: "", difficultyCoefficient: "3", estimatedHours: "" });
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
          <Tab>Board</Tab>
          <Tab>Workload</Tab>
          <Tab>Activity</Tab>
          <Tab>Stand-up</Tab>
          <Tab>Timesheets</Tab>
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

          {/* ── Board ─────────────────────────────────────────────────────── */}
          <TabPanel>
            <TaskBoardTab />
          </TabPanel>

          {/* ── Workload ──────────────────────────────────────────────────── */}
          <TabPanel>
            <WorkloadTab />
          </TabPanel>

          {/* ── Activity ──────────────────────────────────────────────────── */}
          <TabPanel>
            <ActivityTab />
          </TabPanel>

          {/* ── Stand-up ──────────────────────────────────────────────────── */}
          <TabPanel>
            <StandupTab />
          </TabPanel>

          {/* ── Timesheets ────────────────────────────────────────────────── */}
          <TabPanel>
            <TimesheetsTab />
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
          workType: form.workType ? (form.workType as (typeof TaskWorkType.options)[number]) : undefined,
          difficultyCoefficient: parseInt(form.difficultyCoefficient, 10) || 3,
          estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
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
          <Stack orientation="horizontal" gap={5}>
            <Select id="nt-wtype" labelText="Work type" value={form.workType}
              onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}>
              <SelectItem value="" text="— none —" />
              {TaskWorkType.options.map((w) => (
                <SelectItem key={w} value={w} text={TASK_WORK_TYPE_LABEL[w] ?? w} />
              ))}
            </Select>
            <Select id="nt-diff" labelText="Difficulty (1–5)" value={form.difficultyCoefficient}
              onChange={(e) => setForm((f) => ({ ...f, difficultyCoefficient: e.target.value }))}>
              {[1,2,3,4,5].map((d) => (
                <SelectItem key={d} value={String(d)} text={String(d)} />
              ))}
            </Select>
            <TextInput id="nt-hrs" labelText="Est. hours" type="number" value={form.estimatedHours}
              onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} />
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
