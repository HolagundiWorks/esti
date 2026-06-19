import {
  Button,
  InlineLoading,
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
  TextInput,
  Tile,
} from "@carbon/react";
import { Add, Renew } from "@carbon/icons-react";
import { CONSTRUCTION_SCHEDULE_TEMPLATES } from "@esti/contracts";
import { useState } from "react";
import { formatGanttShortDate, GanttChart } from "./GanttChart.js";
import { trpc } from "../lib/trpc.js";

export function ProjectConstructionSchedule({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const summaryQ = trpc.constructionSchedule.summary.useQuery({ projectId });
  const dataQ = trpc.constructionSchedule.listActivities.useQuery({ projectId });
  const ganttQ = trpc.constructionSchedule.gantt.useQuery(
    { projectId },
    { enabled: (dataQ.data?.activities.length ?? 0) > 0 },
  );
  const criticalQ = trpc.constructionSchedule.criticalPath.useQuery(
    { projectId },
    { enabled: (dataQ.data?.activities.length ?? 0) > 0 },
  );
  const lookaheadQ = trpc.constructionSchedule.lookahead.useQuery(
    { projectId, weeks: 3 },
    { enabled: (dataQ.data?.activities.length ?? 0) > 0 },
  );

  const applyTemplate = trpc.constructionSchedule.applyTemplate.useMutation({
    onSuccess: () => {
      void utils.constructionSchedule.invalidate();
      void utils.pmc.summary.invalidate({ projectId });
    },
  });
  const createActivity = trpc.constructionSchedule.createActivity.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });
  const updateActivity = trpc.constructionSchedule.updateActivity.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });
  const deleteActivity = trpc.constructionSchedule.deleteActivity.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });
  const createDep = trpc.constructionSchedule.createDependency.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });
  const deleteDep = trpc.constructionSchedule.deleteDependency.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });
  const recalculate = trpc.constructionSchedule.recalculate.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });
  const setBaseline = trpc.constructionSchedule.setBaseline.useMutation({
    onSuccess: () => void utils.constructionSchedule.invalidate(),
  });

  const [tab, setTab] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);
  const [form, setForm] = useState({
    wbsCode: "",
    title: "",
    trade: "",
    durationDays: 5,
    predecessorId: "",
    successorId: "",
    depType: "FS" as "FS" | "SS" | "FF" | "SF",
  });

  const activities = dataQ.data?.activities ?? [];
  const dependencies = dataQ.data?.dependencies ?? [];
  const hasActivities = activities.length > 0;

  if (summaryQ.isLoading || dataQ.isLoading) {
    return <InlineLoading description="Loading construction schedule…" />;
  }

  return (
    <Stack gap={5}>
      <div>
        <h4>Construction schedule</h4>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Site execution baseline, CPM critical path, and look-ahead programme (IS 15883-2 aligned).
          Separate from the office delivery programme.
        </p>
      </div>

      <Stack orientation="horizontal" gap={3}>
        <Button
          kind="primary"
          size="sm"
          disabled={applyTemplate.isPending}
          onClick={() => applyTemplate.mutate({ projectId, force: hasActivities })}
        >
          {hasActivities ? "Re-apply template" : "Apply template"}
        </Button>
        {hasActivities && (
          <>
            <Button kind="secondary" size="sm" renderIcon={Add} onClick={() => setAddOpen(true)}>
              Add activity
            </Button>
            <Button kind="ghost" size="sm" onClick={() => setDepOpen(true)}>
              Add dependency
            </Button>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Renew}
              disabled={recalculate.isPending}
              onClick={() => recalculate.mutate({ projectId })}
            >
              Recalculate CPM
            </Button>
            <Button
              kind="ghost"
              size="sm"
              disabled={setBaseline.isPending}
              onClick={() => setBaseline.mutate({ projectId })}
            >
              Set baseline
            </Button>
          </>
        )}
      </Stack>

      {summaryQ.data && summaryQ.data.activityCount > 0 && (
        <Stack orientation="horizontal" gap={4}>
          <Tag type="blue" size="sm">
            {summaryQ.data.percentComplete}% complete
          </Tag>
          <Tag type={summaryQ.data.criticalOverdue > 0 ? "red" : "gray"} size="sm">
            {summaryQ.data.criticalCount} critical · {summaryQ.data.criticalOverdue} overdue
          </Tag>
          <Tag type="gray" size="sm">
            Baseline end {summaryQ.data.baselineEnd}
          </Tag>
          <Tag type="gray" size="sm">
            Status {summaryQ.data.schedule.status}
          </Tag>
        </Stack>
      )}

      {!hasActivities ? (
        <Tile>
          <Stack gap={5}>
            <h3>No construction schedule yet</h3>
            <p>
              Apply a building-type template (villa, commercial, institutional, etc.) to seed WBS
              activities and dependencies.
            </p>
          </Stack>
        </Tile>
      ) : (
        <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex)}>
          <TabList contained>
            <Tab>WBS / Activities</Tab>
            <Tab>Dependencies</Tab>
            <Tab>Timeline</Tab>
            <Tab>Look-ahead</Tab>
            <Tab>Critical path</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>WBS</TableHeader>
                      <TableHeader>Activity</TableHeader>
                      <TableHeader>Trade</TableHeader>
                      <TableHeader>Duration</TableHeader>
                      <TableHeader>Planned</TableHeader>
                      <TableHeader>%</TableHeader>
                      <TableHeader>Float</TableHeader>
                      <TableHeader />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activities.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.wbsCode}</TableCell>
                        <TableCell>
                          {a.title}
                          {a.isCritical && (
                            <Tag type="red" size="sm" style={{ marginLeft: 8 }}>
                              Critical
                            </Tag>
                          )}
                        </TableCell>
                        <TableCell>{a.trade ?? "—"}</TableCell>
                        <TableCell>{a.durationDays}d</TableCell>
                        <TableCell>
                          {a.plannedStart ?? "—"}
                          {a.plannedEnd ? ` → ${a.plannedEnd}` : ""}
                        </TableCell>
                        <TableCell>
                          <NumberInput
                            id={`pct-${a.id}`}
                            label=""
                            hideLabel
                            size="sm"
                            min={0}
                            max={100}
                            value={a.percentComplete}
                            onChange={(_, { value }) => {
                              if (value !== undefined) {
                                updateActivity.mutate({
                                  id: a.id,
                                  projectId,
                                  percentComplete: Number(value),
                                });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{a.totalFloat ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            onClick={() => deleteActivity.mutate({ id: a.id, projectId })}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
            <TabPanel>
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Predecessor</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Successor</TableHeader>
                      <TableHeader>Lag</TableHeader>
                      <TableHeader />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dependencies.map((d) => {
                      const pred = activities.find((a) => a.id === d.predecessorId);
                      const succ = activities.find((a) => a.id === d.successorId);
                      return (
                        <TableRow key={d.id}>
                          <TableCell>{pred ? `${pred.wbsCode} ${pred.title}` : d.predecessorId}</TableCell>
                          <TableCell>{d.type}</TableCell>
                          <TableCell>{succ ? `${succ.wbsCode} ${succ.title}` : d.successorId}</TableCell>
                          <TableCell>{d.lagDays}d</TableCell>
                          <TableCell>
                            <Button
                              kind="danger--ghost"
                              size="sm"
                              onClick={() => deleteDep.mutate({ id: d.id, projectId })}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
            <TabPanel>
              {ganttQ.isLoading ? (
                <InlineLoading description="Loading timeline…" />
              ) : ganttQ.data ? (
                <GanttChart
                  ariaLabel="Construction schedule Gantt"
                  rangeStart={ganttQ.data.rangeStart}
                  rangeEnd={ganttQ.data.rangeEnd}
                  intro={
                    <p className="esti-gantt__intro">
                      Construction timeline — {formatGanttShortDate(ganttQ.data.rangeStart)} →{" "}
                      {formatGanttShortDate(ganttQ.data.rangeEnd)}. Red bars = critical path.
                    </p>
                  }
                  rows={ganttQ.data.rows.map((r) => ({
                    id: r.id,
                    label: `${r.wbsCode} ${r.label}`,
                    tag: r.isCritical ?
                      { text: "Critical", type: "red" as const }
                    : { text: r.trade ?? "Activity", type: "teal" as const },
                    meta: `${formatGanttShortDate(r.start)} – ${formatGanttShortDate(r.end)} · ${r.percentComplete}%`,
                    start: r.start,
                    end: r.end,
                    isCritical: r.isCritical,
                    isDone: r.percentComplete >= 100,
                    actualStart: r.actualStart,
                    actualEnd: r.actualEnd,
                  }))}
                />
              ) : (
                <p>Timeline unavailable.</p>
              )}
            </TabPanel>
            <TabPanel>
              {lookaheadQ.isLoading ? (
                <InlineLoading description="Loading look-ahead…" />
              ) : (lookaheadQ.data?.length ?? 0) === 0 ? (
                <p>No activities starting in the next 3 weeks.</p>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Start</TableHeader>
                        <TableHeader>Activity</TableHeader>
                        <TableHeader>Trade</TableHeader>
                        <TableHeader>Constraint</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lookaheadQ.data!.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.plannedStart}</TableCell>
                          <TableCell>
                            {row.wbsCode} {row.title}
                          </TableCell>
                          <TableCell>{row.trade ?? "—"}</TableCell>
                          <TableCell>
                            <Tag type={row.isCritical ? "red" : "blue"} size="sm">
                              {row.constraint}
                            </Tag>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
            <TabPanel>
              {(criticalQ.data?.length ?? 0) === 0 ? (
                <p>No critical activities — run CPM after adding dependencies.</p>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>WBS</TableHeader>
                        <TableHeader>Activity</TableHeader>
                        <TableHeader>Planned</TableHeader>
                        <TableHeader>%</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {criticalQ.data!.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.wbsCode}</TableCell>
                          <TableCell>{row.title}</TableCell>
                          <TableCell>
                            {row.plannedStart} → {row.plannedEnd}
                          </TableCell>
                          <TableCell>{row.percentComplete}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      <Modal
        open={addOpen}
        modalHeading="Add construction activity"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={() => {
          createActivity.mutate({
            projectId,
            wbsCode: form.wbsCode,
            title: form.title,
            trade: form.trade || undefined,
            durationDays: form.durationDays,
          });
          setForm((f) => ({ ...f, wbsCode: "", title: "", trade: "" }));
          setAddOpen(false);
        }}
      >
        <Stack gap={4}>
          <TextInput
            id="wbs"
            labelText="WBS code"
            value={form.wbsCode}
            onChange={(e) => setForm((f) => ({ ...f, wbsCode: e.target.value }))}
          />
          <TextInput
            id="title"
            labelText="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <TextInput
            id="trade"
            labelText="Trade"
            value={form.trade}
            onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
          />
          <NumberInput
            id="dur"
            label="Duration (days)"
            min={1}
            value={form.durationDays}
            onChange={(_, { value }) => {
              if (value !== undefined) setForm((f) => ({ ...f, durationDays: Number(value) }));
            }}
          />
          {createActivity.error && (
            <InlineNotification kind="error" title="Error" subtitle={createActivity.error.message} hideCloseButton />
          )}
        </Stack>
      </Modal>

      <Modal
        open={depOpen}
        modalHeading="Add dependency"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => setDepOpen(false)}
        onRequestSubmit={() => {
          createDep.mutate({
            projectId,
            predecessorId: form.predecessorId,
            successorId: form.successorId,
            type: form.depType,
          });
          setDepOpen(false);
        }}
      >
        <Stack gap={4}>
          <Select
            id="pred"
            labelText="Predecessor"
            value={form.predecessorId}
            onChange={(e) => setForm((f) => ({ ...f, predecessorId: e.target.value }))}
          >
            <SelectItem value="" text="Select…" />
            {activities.map((a) => (
              <SelectItem key={a.id} value={a.id} text={`${a.wbsCode} ${a.title}`} />
            ))}
          </Select>
          <Select
            id="succ"
            labelText="Successor"
            value={form.successorId}
            onChange={(e) => setForm((f) => ({ ...f, successorId: e.target.value }))}
          >
            <SelectItem value="" text="Select…" />
            {activities.map((a) => (
              <SelectItem key={a.id} value={a.id} text={`${a.wbsCode} ${a.title}`} />
            ))}
          </Select>
          <Select
            id="dtype"
            labelText="Type"
            value={form.depType}
            onChange={(e) =>
              setForm((f) => ({ ...f, depType: e.target.value as typeof f.depType }))
            }
          >
            {(["FS", "SS", "FF", "SF"] as const).map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
        </Stack>
      </Modal>

      <p className="esti-label esti-label--helper">
        Templates:{" "}
        {Object.values(CONSTRUCTION_SCHEDULE_TEMPLATES)
          .map((t) => t.label)
          .join(" · ")}
      </p>
    </Stack>
  );
}
