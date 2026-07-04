import {
  Accordion,
  AccordionItem,
  Button,
  Column,
  Grid,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  Jurisdiction,
  PROJECT_WORK_TYPE_LABEL,
  ProjectType,
  ProjectWorkType,
  type BriefBasicInfo,
  type BriefDesignPrefs,
  type BriefMaterials,
  type BriefOccupants,
  type BriefProjectInfo,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { ProjectAppointment } from "./ProjectAppointment.js";
import { CurrentPhaseSelect } from "./CurrentPhaseSelect.js";
import { trpc } from "../lib/trpc.js";

export function ProjectInfo({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery({ id: projectId });
  const briefQ = trpc.projectBrief.getByProject.useQuery({ projectId });
  const phasesQ = trpc.phases.listByProject.useQuery({ projectId });

  const upsert = trpc.projectBrief.upsertSection.useMutation({
    onSuccess: () => void utils.projectBrief.getByProject.invalidate({ projectId }),
  });
  const updateProject = trpc.projectOffice.update.useMutation({
    onSuccess: () => {
      void utils.projectOffice.byId.invalidate({ id: projectId });
      void utils.projectBrief.getByProject.invalidate({ projectId });
    },
  });
  const updateSite = trpc.projectOffice.updateSite.useMutation({
    onSuccess: () => void utils.projectOffice.byId.invalidate({ id: projectId }),
  });

  const [identity, setIdentity] = useState({
    title: "",
    projectType: "Residential Architecture",
    workType: "ARCHITECTURE",
    jurisdiction: "OTHER",
    dateStart: "",
    // Contract value is captured in rupees here and stored as integer paise.
    contractValueRupees: "",
    siteAddress: "",
    siteAreaSqm: "",
  });
  const [basic, setBasic] = useState<BriefBasicInfo>({});
  const [projInfo, setProjInfo] = useState<BriefProjectInfo>({});
  const [occupants, setOccupants] = useState<BriefOccupants>({ household: [] });
  const [design, setDesign] = useState<BriefDesignPrefs>({});
  const [materials, setMaterials] = useState<BriefMaterials>({});
  const [assumptions, setAssumptions] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [approvedAt, setApprovedAt] = useState("");

  useEffect(() => {
    const p = projectQ.data;
    if (p) {
      setIdentity({
        title: p.title,
        projectType: p.projectType,
        workType: (p as { workType?: string }).workType ?? "ARCHITECTURE",
        jurisdiction: p.jurisdiction,
        dateStart: p.dateStart ?? "",
        contractValueRupees: p.contractValuePaise ? String(p.contractValuePaise / 100) : "",
        siteAddress: p.siteAddress ?? "",
        siteAreaSqm: p.siteAreaSqm != null ? String(p.siteAreaSqm) : "",
      });
    }
  }, [projectQ.data]);

  useEffect(() => {
    const b = briefQ.data;
    if (!b) return;
    setBasic((b.basicInfo as BriefBasicInfo) ?? {});
    setProjInfo((b.projectInfo as BriefProjectInfo) ?? {});
    setOccupants((b.occupants as BriefOccupants) ?? { household: [] });
    setDesign((b.designPrefs as BriefDesignPrefs) ?? {});
    setMaterials((b.materials as BriefMaterials) ?? {});
    setAssumptions(b.assumptions ?? "");
    setApprovalNote(b.approvalNote ?? "");
    setApprovedAt(b.approvedAt ?? "");
  }, [briefQ.data]);

  if (projectQ.isLoading || briefQ.isLoading) return <p>Loading project info…</p>;
  if (!projectQ.data) return <p>Project not found.</p>;

  const p = projectQ.data;
  const phases = phasesQ.data ?? [];

  return (
    <Stack gap={6}>
      <div>
        <h3>Project Info</h3>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Questionnaire answers and site context — the single source for
          project briefing data.
        </p>
      </div>

      <Accordion>
        <AccordionItem title="1. Project summary">
          <Stack gap={4}>
            <Grid narrow>
              <Column sm={4} md={4} lg={8}>
                <TextInput
                  id="pi-title"
                  labelText="Project title"
                  value={identity.title}
                  onChange={(e) => setIdentity((x) => ({ ...x, title: e.target.value }))}
                />
              </Column>
              <Column sm={4} md={4} lg={4}>
                <CurrentPhaseSelect
                  id="pi-current-stage"
                  projectId={projectId}
                  phases={phases}
                  currentPhaseId={p.currentPhaseId}
                  labelText="Current stage"
                />
              </Column>
              <Column sm={4} md={4} lg={4}>
                <Select
                  id="pi-type"
                  labelText="Building use"
                  value={identity.projectType}
                  onChange={(e) => setIdentity((x) => ({ ...x, projectType: e.target.value }))}
                >
                  {ProjectType.options.map((t) => (
                    <SelectItem key={t} value={t} text={t} />
                  ))}
                </Select>
              </Column>
              <Column sm={4} md={4} lg={4}>
                <Select
                  id="pi-work"
                  labelText="Work type"
                  value={identity.workType}
                  onChange={(e) => setIdentity((x) => ({ ...x, workType: e.target.value }))}
                >
                  {ProjectWorkType.options.map((t) => (
                    <SelectItem key={t} value={t} text={PROJECT_WORK_TYPE_LABEL[t]} />
                  ))}
                </Select>
              </Column>
              <Column sm={4} md={4} lg={4}>
                <TextInput
                  id="pi-start"
                  labelText="Start date"
                  type="date"
                  value={identity.dateStart}
                  onChange={(e) => setIdentity((x) => ({ ...x, dateStart: e.target.value }))}
                />
              </Column>
              <Column sm={4} md={4} lg={4}>
                <TextInput
                  id="pi-contract-value"
                  labelText="Contract value (₹)"
                  type="number"
                  min={0}
                  placeholder="0"
                  helperText="Total fee/contract value for this project."
                  value={identity.contractValueRupees}
                  onChange={(e) => setIdentity((x) => ({ ...x, contractValueRupees: e.target.value }))}
                />
              </Column>
            </Grid>
            <Button
              size="sm"
              disabled={updateProject.isPending}
              onClick={() =>
                updateProject.mutate({
                  id: projectId,
                  title: identity.title,
                  status: p.status as "ENQUIRY" | "PROPOSAL" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED",
                  projectType: identity.projectType as (typeof ProjectType.options)[number],
                  workType: identity.workType as (typeof ProjectWorkType.options)[number],
                  jurisdiction: identity.jurisdiction as (typeof Jurisdiction.options)[number],
                  dateStart: identity.dateStart || null,
                  contractValuePaise:
                    identity.contractValueRupees.trim() === ""
                      ? 0
                      : Math.round(Number(identity.contractValueRupees) * 100),
                })
              }
            >
              Save project summary
            </Button>
            <ProjectAppointment projectId={projectId} />
          </Stack>
        </AccordionItem>

        <AccordionItem title="2. Client & occupants">
          <Stack gap={4}>
            <TextInput
              id="bi-name"
              labelText="Client name"
              value={basic.clientName ?? ""}
              onChange={(e) => setBasic((x) => ({ ...x, clientName: e.target.value }))}
            />
            <TextInput
              id="bi-mobile"
              labelText="Mobile"
              value={basic.mobile ?? ""}
              onChange={(e) => setBasic((x) => ({ ...x, mobile: e.target.value }))}
            />
            <TextInput
              id="bi-email"
              labelText="Email"
              value={basic.email ?? ""}
              onChange={(e) => setBasic((x) => ({ ...x, email: e.target.value }))}
            />
            <TextArea
              id="occ-staff"
              labelText="Staff requirements"
              value={occupants.staffRequirements ?? ""}
              onChange={(e) => setOccupants((x) => ({ ...x, staffRequirements: e.target.value }))}
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => {
                upsert.mutate({ projectId, section: "basicInfo", data: basic });
                upsert.mutate({ projectId, section: "occupants", data: occupants });
              }}
            >
              Save client & occupants
            </Button>
          </Stack>
        </AccordionItem>

        <AccordionItem title="3. Site context">
          <Stack gap={4}>
            <TextInput
              id="site-addr"
              labelText="Site address"
              value={identity.siteAddress}
              onChange={(e) => setIdentity((x) => ({ ...x, siteAddress: e.target.value }))}
            />
            <TextInput
              id="site-area"
              labelText="Site area (sq m)"
              value={identity.siteAreaSqm}
              onChange={(e) => setIdentity((x) => ({ ...x, siteAreaSqm: e.target.value }))}
            />
            <TextArea
              id="bi-terrain"
              labelText="Terrain & site notes"
              value={basic.terrain ?? ""}
              onChange={(e) => setBasic((x) => ({ ...x, terrain: e.target.value }))}
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => {
                updateSite.mutate({
                  id: projectId,
                  siteAddress: identity.siteAddress || undefined,
                  siteAreaSqm: identity.siteAreaSqm ? Number(identity.siteAreaSqm) : undefined,
                });
                upsert.mutate({
                  projectId,
                  section: "basicInfo",
                  data: { ...basic, siteAddress: identity.siteAddress },
                });
              }}
            >
              Save site context
            </Button>
          </Stack>
        </AccordionItem>

        <AccordionItem title="4. Design drivers">
          <Stack gap={4}>
            <TextArea
              id="dg-style"
              labelText="Style & preferences"
              value={design.style ?? ""}
              onChange={(e) => setDesign((x) => ({ ...x, style: e.target.value }))}
              rows={3}
            />
            <TextArea
              id="dg-activities"
              labelText="Important activities"
              value={design.activities ?? ""}
              onChange={(e) => setDesign((x) => ({ ...x, activities: e.target.value }))}
              rows={3}
            />
            <TextArea
              id="dg-outdoor"
              labelText="Outdoor preferences"
              value={design.outdoorPrefs ?? ""}
              onChange={(e) => setDesign((x) => ({ ...x, outdoorPrefs: e.target.value }))}
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => upsert.mutate({ projectId, section: "designPrefs", data: design })}
            >
              Save design drivers
            </Button>
          </Stack>
        </AccordionItem>

        <AccordionItem title="5–7. Programme, materials, approval">
          <Stack gap={4}>
            <TextArea
              id="pi-bua"
              labelText="Built-up area / programme notes"
              value={projInfo.intendedUse ?? ""}
              onChange={(e) => setProjInfo((x) => ({ ...x, intendedUse: e.target.value }))}
              rows={2}
            />
            <TextArea
              id="mat-notes"
              labelText="Materials palette"
              value={materials.construction ?? ""}
              onChange={(e) => setMaterials((x) => ({ ...x, construction: e.target.value }))}
              rows={3}
            />
            <TextArea
              id="assumptions"
              labelText="Assumptions & exclusions"
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              rows={3}
            />
            <TextArea
              id="approval"
              labelText="Client approval note"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows={2}
            />
            <TextInput
              id="approved-at"
              labelText="Approved on"
              type="date"
              value={approvedAt}
              onChange={(e) => setApprovedAt(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => {
                upsert.mutate({ projectId, section: "projectInfo", data: projInfo });
                upsert.mutate({ projectId, section: "materials", data: materials });
                upsert.mutate({ projectId, section: "assumptions", data: { assumptions } });
                upsert.mutate({
                  projectId,
                  section: "approval",
                  data: { approvalNote, approvedAt: approvedAt || undefined },
                });
              }}
            >
              Save programme & approval
            </Button>
          </Stack>
        </AccordionItem>
      </Accordion>
    </Stack>
  );
}
