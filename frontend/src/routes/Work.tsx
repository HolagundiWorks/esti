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
import { TaskCalendarTab } from "../components/work/TaskCalendarTab.js";
import { TasksTab, type TasksTabHandle } from "../components/work/TasksTab.js";
import { WorkloadTab } from "../components/work/WorkloadTab.js";
import { can } from "@esti/contracts";
import { type WorkTabSlug } from "../components/work/workHelpers.js";
import { ClientRequests } from "./ClientRequests.js";
import { ConsultantRequests } from "./ConsultantRequests.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

type TabDef = { slug: WorkTabSlug; label: string; panel: React.ReactNode };

export function Work() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;

  const canWrite = can(user?.role, "write");    // L4+ (ASSOCIATE and above)
  const canHr = can(user?.role, "hr:manage");   // L2+ (PARTNER and above)

  const tasksRef = useRef<TasksTabHandle>(null);

  // Build the visible tab list based on role capabilities and module toggles
  const allTabs: TabDef[] = [
    { slug: "tasks", label: "Tasks", panel: <TasksTab ref={tasksRef} /> },
    { slug: "board", label: "Board", panel: <TaskBoardTab /> },
    { slug: "calendar", label: "Calendar", panel: <TaskCalendarTab /> },
    // Workload: HR module + L2+ (hr:manage)
    ...(hrEnabled && canHr
      ? [{ slug: "workload" as WorkTabSlug, label: "Workload", panel: <WorkloadTab /> }]
      : []),
    { slug: "activity", label: "Activity", panel: <ActivityTab /> },
    // Portal triage tabs: L4+ (write)
    ...(canWrite
      ? [
          { slug: "client-requests" as WorkTabSlug, label: "Client requests", panel: <ClientRequests embedded /> },
          { slug: "consultant-requests" as WorkTabSlug, label: "Consultant requests", panel: <ConsultantRequests embedded /> },
        ]
      : []),
    // Attendance: HR module + L2+ (hr:manage)
    ...(hrEnabled && canHr
      ? [{ slug: "attendance" as WorkTabSlug, label: "Attendance", panel: <AttendanceTab /> }]
      : []),
  ];

  const tab = (searchParams.get("tab") ?? "tasks") as WorkTabSlug;
  const tabIndex = Math.max(
    0,
    allTabs.findIndex((t) => t.slug === tab),
  );
  const activeTab = allTabs[tabIndex]?.slug ?? "tasks";

  return (
    <Stack gap={6}>
      <PageHeader
        title="Work"
        description={
          hrEnabled && canHr
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
          setSearchParams({ tab: allTabs[selectedIndex]?.slug ?? "tasks" }, { replace: true })
        }
      >
        <TabList aria-label="Work sections" contained>
          {allTabs.map((t) => <Tab key={t.slug}>{t.label}</Tab>)}
        </TabList>
        <TabPanels>
          {allTabs.map((t) => <TabPanel key={t.slug}>{t.panel}</TabPanel>)}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
