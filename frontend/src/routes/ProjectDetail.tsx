import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
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
  TextInput,
} from "@carbon/react";
import {
  COA_MIN_FEE_PCT,
  CoaWorkCategory,
  PROJECT_WORK_TYPE_LABEL,
  PhaseStatus,
  can,
  coaMinimumFee,
  formatINR,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { FeeProposalPdfCell } from "../components/FeeProposalPdfCell.js";
import { ProjectApprovals } from "../components/ProjectApprovals.js";
import { ProjectBylawCalc } from "../components/ProjectBylawCalc.js";
import { ProjectBylaws } from "../components/ProjectBylaws.js";
import { ProjectClientLog } from "../components/ProjectClientLog.js";
import { ProjectDrawings } from "../components/ProjectDrawings.js";
import { ProjectEngagements } from "../components/ProjectEngagements.js";
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
  const { user } = useAuth();
  const canFees = can(user?.role, "fees:manage");
  const utils = trpc.useUtils();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const hrEnabled = trpc.settings.get.useQuery().data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const feesQ = trpc.feeProposals.listByProject.useQuery({ projectId: id }, { enabled: !!id });
  const updatePhase = trpc.phases.update.useMutation({
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId: id }),
  });

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("RESIDENTIAL_INDIVIDUAL");
  const [cost, setCost] = useState("");
  const [fee, setFee] = useState("");
  const [docComm, setDocComm] = useState("10");
  const [override, setOverride] = useState("");

  const createFee = trpc.feeProposals.create.useMutation({
    onSuccess: () => {
      utils.feeProposals.listByProject.invalidate({ projectId: id });
      setOpen(false);
      setCost("");
      setFee("");
      setOverride("");
    },
  });


  const TAB_SLUGS = [
    "phases",
    ...(canFees ? ["fees"] : []),
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

  // Live COA benchmark in the modal
  const costPaise = Math.round(Number(cost || "0") * 100);
  const feePaise = Math.round(Number(fee || "0") * 100);
  const coaMin = costPaise > 0 ? coaMinimumFee(category as keyof typeof COA_MIN_FEE_PCT, costPaise) : 0;
  const below = feePaise > 0 && coaMin > 0 && isBelowCoaMinimum(feePaise, coaMin);
  const ratioPct = coaMin > 0 ? Math.round((feePaise / coaMin) * 100) : 0;
  const docCommPaise = Math.round((feePaise * Number(docComm || "0")) / 100);

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
          {canFees && <Tab>Fees</Tab>}
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
        {canFees && (
        <TabPanel>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Fee proposals</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          New fee proposal
        </Button>
      </div>
      <TableContainer title="COA fee proposals" description="Benchmarked against the COA scale">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Cost of works</TableHeader>
              <TableHeader>Quoted fee</TableHeader>
              <TableHeader>COA min</TableHeader>
              <TableHeader>% of COA</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Document</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(feesQ.data ?? []).map((f) => {
              const pct = f.coaMinimumPaise > 0 ? Math.round((f.feePaise / f.coaMinimumPaise) * 100) : 0;
              return (
                <TableRow key={f.id}>
                  <TableCell>{f.ref}</TableCell>
                  <TableCell>{f.workCategory}</TableCell>
                  <TableCell>{formatINR(f.costOfWorksPaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(f.feePaise, { paise: false })}</TableCell>
                  <TableCell>{formatINR(f.coaMinimumPaise, { paise: false })}</TableCell>
                  <TableCell>
                    <Tag type={f.belowMinimum ? "red" : "green"}>{pct}%</Tag>
                  </TableCell>
                  <TableCell>{f.status}</TableCell>
                  <TableCell>
                    <FeeProposalPdfCell feeId={f.id} initialStatus={f.pdfStatus} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

        </TabPanel>
        )}
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
      {hrEnabled && <ProjectTeam projectId={id} />}

      <ProjectEngagements projectId={id} />
        </TabPanel>
        <TabPanel>
          <ProjectSettings projectId={id} />
        </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal
        open={open}
        modalHeading="New fee proposal"
        primaryButtonText={createFee.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!cost || !fee || (below && !override) || createFee.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          createFee.mutate({
            projectId: id,
            workCategory: category as (typeof CoaWorkCategory)[keyof typeof CoaWorkCategory],
            costOfWorksPaise: costPaise,
            feePaise,
            docCommPct: Number(docComm || "0"),
            overrideReason: override || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="f-cat"
            labelText="Work category (COA scale)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.values(CoaWorkCategory).map((c) => (
              <SelectItem key={c} value={c} text={`${c} (${COA_MIN_FEE_PCT[c]}%)`} />
            ))}
          </Select>
          <TextInput
            id="f-cost"
            labelText="Cost of works — construction, excl. land (₹)"
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <TextInput
            id="f-fee"
            labelText="Quoted professional fee (₹)"
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <TextInput
            id="f-dc"
            labelText="Documentation & Communication (%)"
            type="number"
            value={docComm}
            onChange={(e) => setDocComm(e.target.value)}
          />
          {coaMin > 0 && (
            <div style={{ fontSize: "0.875rem" }}>
              COA minimum: <strong>{formatINR(coaMin, { paise: false })}</strong> · Quoted at{" "}
              <strong>{ratioPct}%</strong> of COA minimum · D&amp;C{" "}
              {formatINR(docCommPaise, { paise: false })}
            </div>
          )}
          {below && (
            <>
              <InlineNotification
                kind="warning"
                title="Below COA minimum"
                subtitle="An override reason is required to quote below the COA scale."
                hideCloseButton
                lowContrast
              />
              <TextInput
                id="f-override"
                labelText="Override reason (required)"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            </>
          )}
          {createFee.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={createFee.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
