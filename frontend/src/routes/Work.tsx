import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import { useScreenActions } from "@hcw/ui-kit";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { ActivityTab } from "../components/work/ActivityTab.js";
import { AttendanceTab } from "../components/work/AttendanceTab.js";
import { TaskBoardTab } from "../components/work/TaskBoardTab.js";
import { TaskCalendarTab } from "../components/work/TaskCalendarTab.js";
import { TasksTab, type TasksTabHandle } from "../components/work/TasksTab.js";
import { WorkloadTab } from "../components/work/WorkloadTab.js";
import { can } from "@esti/contracts";
import { canonicalWorkTab, type WorkTabSlug } from "../components/work/workHelpers.js";
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
    // Portal triage: one "Requests" tab, both queues stacked (Miller — the tab
    // bar had hit 8; legacy client-/consultant-requests slugs alias here).
    ...(canWrite
      ? [
          {
            slug: "requests" as WorkTabSlug,
            label: "Requests",
            panel: (
              <Stack spacing={4}>
                <Stack spacing={1}>
                  <Typography variant="h6" component="h2">Client requests</Typography>
                  <ClientRequests embedded />
                </Stack>
                <Stack spacing={1}>
                  <Typography variant="h6" component="h2">Consultant requests</Typography>
                  <ConsultantRequests embedded />
                </Stack>
              </Stack>
            ),
          },
        ]
      : []),
    // Attendance: HR module + L2+ (hr:manage)
    ...(hrEnabled && canHr
      ? [{ slug: "attendance" as WorkTabSlug, label: "Attendance", panel: <AttendanceTab /> }]
      : []),
  ];

  const tab = canonicalWorkTab((searchParams.get("tab") ?? "tasks") as WorkTabSlug);
  const tabIndex = Math.max(
    0,
    allTabs.findIndex((t) => t.slug === tab),
  );
  const activeTab = allTabs[tabIndex]?.slug ?? "tasks";

  useScreenActions(
    activeTab === "tasks"
      ? [
          {
            id: "new-task",
            zone: "center",
            tone: "primary",
            label: "New task",
            icon: <AddIcon />,
            onClick: () => tasksRef.current?.openCreate(),
          },
        ]
      : [],
    [activeTab],
  );

  return (
    <RailLayout
      title="Work"
      description={
        hrEnabled && canHr
          ? "Tasks, portal triage, workload, attendance, and office activity."
          : "Tasks, client and consultant requests, and activity — enable Team & HR for workload and attendance."
      }
      tabs={
        <Tabs
          orientation="vertical"
          value={tabIndex}
          onChange={(_e, v: number) =>
            setSearchParams({ tab: allTabs[v]?.slug ?? "tasks" }, { replace: true })
          }
          aria-label="Work sections"
        >
          {allTabs.map((t) => (
            <Tab key={t.slug} label={t.label} />
          ))}
        </Tabs>
      }
    >
      <PageBreadcrumb
        items={[
          { label: "Tasks" },
          { label: allTabs[tabIndex]?.label ?? "Tasks" },
        ]}
      />
      <Box>{allTabs[tabIndex]?.panel}</Box>
    </RailLayout>
  );
}
