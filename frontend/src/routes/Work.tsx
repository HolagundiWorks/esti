import {
  Button,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@carbon/react";
import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { ActivityTab } from "../components/work/ActivityTab.js";
import { AttendanceTab } from "../components/work/AttendanceTab.js";
import { TaskBoardTab } from "../components/work/TaskBoardTab.js";
import { TasksTab, type TasksTabHandle } from "../components/work/TasksTab.js";
import { WorkloadTab } from "../components/work/WorkloadTab.js";
import { type WorkTabSlug, workTabsForNav } from "../components/work/workHelpers.js";
import { ClientRequests } from "./ClientRequests.js";
import { ConsultantRequests } from "./ConsultantRequests.js";
import { trpc } from "../lib/trpc.js";

export function Work() {
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const visibleTabs = workTabsForNav(hrEnabled);
  const tab = (searchParams.get("tab") ?? "tasks") as WorkTabSlug;
  const tabIndex = Math.max(
    0,
    visibleTabs.indexOf(
      visibleTabs.includes(tab as (typeof visibleTabs)[number])
        ? (tab as (typeof visibleTabs)[number])
        : "tasks",
    ),
  );
  const tasksRef = useRef<TasksTabHandle>(null);
  const activeTab = visibleTabs[tabIndex] ?? "tasks";

  return (
    <Stack gap={6}>
      <PageHeader
        title="Work"
        description={
          hrEnabled
            ? "Tasks, portal triage, workload, attendance, and office activity."
            : "Tasks, client and consultant requests, and activity — enable Team & HR for workload and attendance."
        }
        actions={
          activeTab === "tasks" ? (
            <Button onClick={() => tasksRef.current?.openCreate()}>New task</Button>
          ) : undefined
        }
      />

      <Tabs
        selectedIndex={tabIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams({ tab: visibleTabs[selectedIndex] ?? "tasks" }, { replace: true })
        }
      >
        <TabList aria-label="Work sections" contained>
          <Tab>Tasks</Tab>
          <Tab>Board</Tab>
          {hrEnabled && <Tab>Workload</Tab>}
          <Tab>Activity</Tab>
          <Tab>Client requests</Tab>
          <Tab>Consultant requests</Tab>
          {hrEnabled && <Tab>Attendance</Tab>}
        </TabList>

        <TabPanels>
          <TabPanel>
            <TasksTab ref={tasksRef} />
          </TabPanel>
          <TabPanel>
            <TaskBoardTab />
          </TabPanel>
          {hrEnabled && (
            <TabPanel>
              <WorkloadTab />
            </TabPanel>
          )}
          <TabPanel>
            <ActivityTab />
          </TabPanel>
          <TabPanel>
            <ClientRequests embedded />
          </TabPanel>
          <TabPanel>
            <ConsultantRequests embedded />
          </TabPanel>
          {hrEnabled && (
            <TabPanel>
              <AttendanceTab />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
