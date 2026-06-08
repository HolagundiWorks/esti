import {
  Select,
  SelectItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tag,
} from "@carbon/react";
import { PROJECT_WORK_TYPE_LABEL, PhaseStatus, formatINR } from "@esti/contracts";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProjectApprovals } from "../components/ProjectApprovals.js";
import { ProjectBylawCalc } from "../components/ProjectBylawCalc.js";
import { ProjectBylaws } from "../components/ProjectBylaws.js";
import { ProjectClientLog } from "../components/ProjectClientLog.js";
import { ProjectDrawings } from "../components/ProjectDrawings.js";
import { ProjectBbs } from "../components/ProjectBbs.js";
import { ProjectDocuments } from "../components/ProjectDocuments.js";
import { ProjectEstimates } from "../components/ProjectEstimates.js";
import { ProjectPurchaseOrders } from "../components/ProjectPurchaseOrders.js";
import { ProjectSettings } from "../components/ProjectSettings.js";
import { ProjectTransmittals } from "../components/ProjectTransmittals.js";
import { ProjectTeam } from "../components/ProjectTeam.js";
import { ProjectPermits } from "../components/ProjectPermits.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "purple" | "teal" | "green"> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  CLIENT_REVIEW: "purple",
  APPROVED: "teal",
  COMPLETE: "green",
};

const PROJECT_STATUS_TAG: Record<string, "gray" | "blue" | "purple" | "green" | "red"> = {
  ENQUIRY: "gray",
  ACTIVE: "blue",
  ON_HOLD: "purple",
  COMPLETED: "green",
  CANCELLED: "red",
};

export function ProjectDetail() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const utils = trpc.useUtils();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const hrEnabled = trpc.settings.get.useQuery().data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const updatePhase = trpc.phases.update.useMutation({
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId: id }),
  });

  const TAB_SLUGS = [
    "phases",
    "clientlog",
    "compliance",
    "costing",
    "drawings",
    "documents",
    "team",
    "settings",
  ];
  const tabSlug = searchParams.get("tab") ?? "phases";
  const tabIndex = Math.max(0, TAB_SLUGS.indexOf(tabSlug));

  if (project.isLoading) return <p>Loading…</p>;
  if (!project.data)
    return (
      <p>
        Project not found. <Link to="/projects">Back</Link>
      </p>
    );
  const p = project.data;

  return (
    <div>
      {/* Sticky project context banner — persists as user scrolls through tab content */}
      <div
        style={{
          position: "sticky",
          top: 48,
          zIndex: 100,
          backgroundColor: "var(--cds-background)",
          borderBottom: "1px solid var(--cds-border-subtle)",
          paddingBottom: 8,
        }}
      >
        <Link to="/projects" style={{ fontSize: "0.875rem" }}>← Projects</Link>
        <h1 style={{ marginTop: 4, marginBottom: 2 }}>
          {p.ref} — {p.title}
        </h1>
        <div style={{ margin: 0, color: "var(--cds-text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span>
            {PROJECT_WORK_TYPE_LABEL[(p as { workType?: keyof typeof PROJECT_WORK_TYPE_LABEL }).workType ?? "ARCHITECTURE"]} · {p.projectType} · {p.jurisdiction}
          </span>
          <Tag type={PROJECT_STATUS_TAG[p.status] ?? "gray"} size="sm">{p.status}</Tag>
          <span>· {formatINR(p.contractValuePaise, { paise: false })}</span>
        </div>
      </div>

      <Tabs
        selectedIndex={tabIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams({ tab: TAB_SLUGS[selectedIndex] ?? "phases" }, { replace: true })
        }
      >
        <TabList aria-label="Project sections" contained>
          <Tab>Phases</Tab>
          <Tab>Client log</Tab>
          <Tab>Compliance</Tab>
          <Tab>Costing</Tab>
          <Tab>Drawings</Tab>
          <Tab>Documents</Tab>
          <Tab>Team</Tab>
          <Tab>Settings</Tab>
        </TabList>
        <TabPanels>
        <TabPanel>
      <h3 style={{ marginTop: 24, marginBottom: 8 }}>COA phases</h3>
      <TableContainer title="Conditions of Engagement" description="Phase plan & billing schedule">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Stage</TableHeader>
              <TableHeader>Billing %</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Update</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(phasesQ.data ?? []).map((ph) => (
              <TableRow key={ph.id}>
                <TableCell>{ph.label}</TableCell>
                <TableCell>{ph.billingPct}%</TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[ph.status] ?? "gray"}>{ph.status}</Tag>
                </TableCell>
                <TableCell>
                  <Select
                    id={`st-${ph.id}`}
                    labelText="Phase status"
                    hideLabel
                    size="sm"
                    value={ph.status}
                    onChange={(e) =>
                      updatePhase.mutate({
                        id: ph.id,
                        status: e.target.value as (typeof PhaseStatus.options)[number],
                      })
                    }
                  >
                    {PhaseStatus.options.map((s) => (
                      <SelectItem key={s} value={s} text={s} />
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

        </TabPanel>
        <TabPanel>
      <ProjectClientLog projectId={id} />
        </TabPanel>
        <TabPanel>
      <ProjectPermits projectId={id} />

      <ProjectBylaws projectId={id} />

      <ProjectBylawCalc projectId={id} />
        </TabPanel>
        <TabPanel>
      <ProjectEstimates projectId={id} />

      <ProjectBbs projectId={id} />

      <ProjectPurchaseOrders projectId={id} />
        </TabPanel>
        <TabPanel>
      <ProjectDrawings projectId={id} />

      <ProjectTransmittals projectId={id} />

      <ProjectApprovals projectId={id} />
        </TabPanel>
        <TabPanel>
      <ProjectDocuments projectId={id} />
        </TabPanel>
        <TabPanel>
      {hrEnabled ? (
        <ProjectTeam projectId={id} />
      ) : (
        <p style={{ marginTop: 24, color: "var(--cds-text-secondary)" }}>
          The Team &amp; HR module is off — enable it in Company settings to assign staff.
        </p>
      )}
        </TabPanel>
        <TabPanel>
          <ProjectSettings projectId={id} />
        </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
