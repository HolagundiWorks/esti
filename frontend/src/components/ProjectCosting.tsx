import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Stack,
} from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { Fragment } from "react";
import { ProjectEstimates } from "./ProjectEstimates.js";
import { CostingWindow } from "./estimation/CostingWindow.js";
import { WorkPackages } from "./estimation/WorkPackages.js";
import { ProjectBbs } from "./ProjectBbs.js";
import { ProjectSteelReconciliation } from "./ProjectSteelReconciliation.js";
import { ProjectMeasurementBook } from "./ProjectMeasurementBook.js";
import { ProjectRunningBills } from "./ProjectRunningBills.js";
import { ProjectControls } from "./ProjectControls.js";
import { ProjectFinalAccount } from "./ProjectFinalAccount.js";
import { ProjectCostDashboard } from "./ProjectCostDashboard.js";
import { ProjectProcurementForecast } from "./ProjectProcurementForecast.js";

/**
 * Single Costing & Measurement window (Phase 4). Presents the full delivery
 * spine — rate analysis → estimation → BOQ → costing → site measurement →
 * RA bills → submissions — as one staged workspace instead of scattered tabs.
 *
 * Rate analysis is office-wide (Knowledge Bank → Rate Analysis) and feeds the
 * estimation stage's rate picker; the remaining stages live on the project.
 */

const SPINE: { key: string; label: string; office?: boolean }[] = [
  { key: "rate-analysis", label: "Rate analysis", office: true },
  { key: "estimation", label: "Estimation & BOQ" },
  { key: "costing", label: "Costing" },
  { key: "packages", label: "Work packages" },
  { key: "controls", label: "Controls" },
  { key: "measurement", label: "Site measurement" },
  { key: "bills", label: "RA bills" },
  { key: "submissions", label: "Submissions" },
  { key: "closure", label: "Final account" },
];

function SpineRail({ active }: { active: string }) {
  return (
    <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap", alignItems: "center" }}>
      {SPINE.map((s, i) => (
        <Fragment key={s.key}>
          <Tag
            type={s.key === active ? "blue" : s.office ? "cool-gray" : "gray"}
            size="sm"
          >
            {s.label}
            {s.office ? " ↗" : ""}
          </Tag>
          {i < SPINE.length - 1 && (
            <ArrowRight size={12} aria-hidden style={{ opacity: 0.5 }} />
          )}
        </Fragment>
      ))}
    </Stack>
  );
}

export function ProjectCosting({ projectId, showBills }: { projectId: string; showBills: boolean }) {
  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h3>Costing &amp; Measurement</h3>
        <p className="esti-label--secondary">
          One window across the delivery spine. Analysed rates are built office-wide in
          Knowledge Bank → Rate Analysis and feed estimation here.
        </p>
      </Stack>

      <Tabs>
        <TabList aria-label="Costing and measurement stages" contained>
          <Tab>Estimation &amp; BOQ</Tab>
          <Tab>Design &amp; components</Tab>
          <Tab>Bar bending schedule</Tab>
          {showBills && <Tab>Work packages</Tab>}
          {showBills && <Tab>Controls</Tab>}
          {showBills && <Tab>Site measurement &amp; RA bills</Tab>}
          {showBills && <Tab>Final account</Tab>}
          {showBills && <Tab>Cost dashboard</Tab>}
          {showBills && <Tab>Procurement forecast</Tab>}
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack gap={5}>
              <SpineRail active="estimation" />
              <ProjectEstimates projectId={projectId} />
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack gap={5}>
              <SpineRail active="estimation" />
              <CostingWindow projectId={projectId} />
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack gap={7}>
              <SpineRail active="costing" />
              <ProjectBbs projectId={projectId} />
              {showBills && <ProjectSteelReconciliation projectId={projectId} />}
            </Stack>
          </TabPanel>
          {showBills && (
            <TabPanel>
              <Stack gap={5}>
                <SpineRail active="packages" />
                <WorkPackages projectId={projectId} />
              </Stack>
            </TabPanel>
          )}
          {showBills && (
            <TabPanel>
              <Stack gap={5}>
                <SpineRail active="controls" />
                <ProjectControls projectId={projectId} />
              </Stack>
            </TabPanel>
          )}
          {showBills && (
            <TabPanel>
              <Stack gap={7}>
                <SpineRail active="measurement" />
                <ProjectMeasurementBook projectId={projectId} />
                <ProjectRunningBills projectId={projectId} />
              </Stack>
            </TabPanel>
          )}
          {showBills && (
            <TabPanel>
              <Stack gap={5}>
                <SpineRail active="closure" />
                <ProjectFinalAccount projectId={projectId} />
              </Stack>
            </TabPanel>
          )}
          {showBills && (
            <TabPanel>
              <Stack gap={5}>
                <SpineRail active="" />
                <ProjectCostDashboard projectId={projectId} />
              </Stack>
            </TabPanel>
          )}
          {showBills && (
            <TabPanel>
              <Stack gap={5}>
                <SpineRail active="" />
                <ProjectProcurementForecast projectId={projectId} />
              </Stack>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
