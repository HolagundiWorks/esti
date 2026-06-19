import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  ProgressBar,
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
import { Add } from "@carbon/icons-react";
import {
  MILESTONE_STATUS_LABEL,
  type MilestoneStatus,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "./DataState.js";
import { ProjectGantt } from "./ProjectGantt.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<MilestoneStatus, "gray" | "blue" | "green" | "red"> = {
  PLANNED: "gray",
  IN_PROGRESS: "blue",
  DONE: "green",
  BLOCKED: "red",
};

export function ProjectProgramme({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const summaryQ = trpc.programme.summary.useQuery({ projectId });
  const phasesQ = trpc.phases.listByProject.useQuery({ projectId });
  const create = trpc.programme.createMilestone.useMutation({
    onSuccess: () => {
      void utils.programme.summary.invalidate({ projectId });
      void utils.programme.listMilestones.invalidate({ projectId });
    },
  });
  const update = trpc.programme.updateMilestone.useMutation({
    onSuccess: () => {
      void utils.programme.summary.invalidate({ projectId });
      void utils.programme.listMilestones.invalidate({ projectId });
    },
  });
  const remove = trpc.programme.deleteMilestone.useMutation({
    onSuccess: () => {
      void utils.programme.summary.invalidate({ projectId });
      void utils.programme.listMilestones.invalidate({ projectId });
    },
  });

  const [open, setOpen] = useState(false);
  const [progTab, setProgTab] = useState(0);
  const [form, setForm] = useState({
    title: "",
    targetDate: "",
    phaseId: "",
    status: "PLANNED" as MilestoneStatus,
  });

  const summary = summaryQ.data;
  const milestones = summary?.milestones ?? [];

  if (summaryQ.isLoading) return <p>Loading programme…</p>;
  if (!summary) return <p>Programme data unavailable.</p>;

  const scheduleView = (
    <Stack gap={6}>
      <div>
        <h3>Office delivery programme</h3>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Internal delivery schedule — design phases, milestones, and Work tasks. For site
          construction scheduling, use the PMC tab when PMC is enabled.
        </p>
      </div>

      <Grid narrow>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <Stack gap={3}>
              <h4>Schedule progress</h4>
              <ProgressBar
                label="Overall"
                value={summary.scheduleProgressPct}
                max={100}
                size="big"
              />
              <p style={{ margin: 0 }}>{summary.scheduleProgressPct}% complete</p>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <Stack gap={2}>
              <h4>Milestones</h4>
              <p style={{ margin: 0 }}>
                {summary.milestoneStats.done} / {summary.milestoneStats.total} done
              </p>
              {summary.milestoneStats.overdue > 0 && (
                <Tag type="red" size="sm">
                  {summary.milestoneStats.overdue} overdue
                </Tag>
              )}
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={4}>
          <Tile>
            <Stack gap={2}>
              <h4>Tasks</h4>
              <p style={{ margin: 0 }}>
                {summary.taskStats.done} / {summary.taskStats.total} done
              </p>
              {summary.taskStats.overdue > 0 && (
                <Tag type="red" size="sm">
                  {summary.taskStats.overdue} overdue
                </Tag>
              )}
              <Button kind="ghost" size="sm" as={Link} to="/tasks">
                Open Work module
              </Button>
            </Stack>
          </Tile>
        </Column>
      </Grid>

      <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>Milestones</h4>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
          Add milestone
        </Button>
      </Stack>

      <DataState
        loading={false}
        isEmpty={milestones.length === 0}
        columnCount={5}
        empty={{
          title: "No milestones yet",
          description:
            "Add deliverable milestones (GFC issue, authority submission, site handover) with target dates.",
        }}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Target</TableHeader>
                <TableHeader>Stage</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {milestones.map((m) => {
                const phase = summary.phases.find((p) => p.id === m.phaseId);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{m.targetDate ?? "—"}</TableCell>
                    <TableCell>{phase?.label ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        id={`ms-${m.id}`}
                        labelText=""
                        hideLabel
                        size="sm"
                        value={m.status}
                        onChange={(e) =>
                          update.mutate({
                            id: m.id,
                            projectId,
                            status: e.target.value as MilestoneStatus,
                          })
                        }
                      >
                        {(Object.keys(MILESTONE_STATUS_LABEL) as MilestoneStatus[]).map((s) => (
                          <SelectItem key={s} value={s} text={MILESTONE_STATUS_LABEL[s]} />
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        onClick={() => remove.mutate({ id: m.id, projectId })}
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
      </DataState>

      <div>
        <h4>Upcoming schedule</h4>
        {summary.upcomingSchedule.length === 0 ? (
          <p>No dated milestones or tasks ahead.</p>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Item</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.upcomingSchedule.map((row) => (
                  <TableRow key={`${row.kind}-${row.id}`}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      <Tag type={row.kind === "milestone" ? "purple" : "teal"} size="sm">
                        {row.kind}
                      </Tag>
                    </TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      <Tag
                        type={
                          row.kind === "milestone" ?
                            STATUS_TAG[row.status as MilestoneStatus]
                          : row.status === "DONE" ?
                            "green"
                          : "gray"
                        }
                        size="sm"
                      >
                        {row.kind === "milestone" ?
                          MILESTONE_STATUS_LABEL[row.status as MilestoneStatus]
                        : row.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      <Modal
        open={open}
        modalHeading="Add milestone"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          create.mutate({
            projectId,
            title: form.title,
            targetDate: form.targetDate || undefined,
            phaseId: form.phaseId || undefined,
            status: form.status,
          });
          setForm({ title: "", targetDate: "", phaseId: "", status: "PLANNED" });
          setOpen(false);
        }}
      >
        <Stack gap={5}>
          <TextInput
            id="ms-title"
            labelText="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <TextInput
            id="ms-date"
            labelText="Target date"
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
          />
          <Select
            id="ms-phase"
            labelText="Delivery stage (optional)"
            value={form.phaseId}
            onChange={(e) => setForm((f) => ({ ...f, phaseId: e.target.value }))}
          >
            <SelectItem value="" text="—" />
            {(phasesQ.data ?? []).map((ph) => (
              <SelectItem key={ph.id} value={ph.id} text={ph.label} />
            ))}
          </Select>
          {create.error && (
            <InlineNotification kind="error" title="Could not save" subtitle={create.error.message} hideCloseButton />
          )}
        </Stack>
      </Modal>
    </Stack>
  );

  return (
    <Stack gap={4}>
      <Tabs selectedIndex={progTab} onChange={({ selectedIndex }) => setProgTab(selectedIndex)}>
        <TabList contained>
          <Tab>Schedule</Tab>
          <Tab>Timeline</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>{scheduleView}</TabPanel>
          <TabPanel>
            <ProjectGantt projectId={projectId} enabled={progTab === 1} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
