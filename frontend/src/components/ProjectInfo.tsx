import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
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

  if (projectQ.isLoading || briefQ.isLoading)
    return <Typography variant="body2">Loading project info…</Typography>;
  if (!projectQ.data)
    return <Typography variant="body2">Project not found.</Typography>;

  const p = projectQ.data;
  const phases = phasesQ.data ?? [];

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h6" component="h3">
          Project Info
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Questionnaire answers and site context — the single source for
          project briefing data.
        </Typography>
      </div>

      {(updateProject.error || updateSite.error || upsert.error) && (
        <Alert severity="error">
          <AlertTitle>Could not save</AlertTitle>
          {(updateProject.error || updateSite.error || upsert.error)?.message ??
            "Something went wrong — please try again."}
        </Alert>
      )}

      <div>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>1. Project summary</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    id="pi-title"
                    label="Project title"
                    value={identity.title}
                    onChange={(e) => setIdentity((x) => ({ ...x, title: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CurrentPhaseSelect
                    id="pi-current-stage"
                    projectId={projectId}
                    phases={phases}
                    currentPhaseId={p.currentPhaseId}
                    labelText="Current stage"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    id="pi-type"
                    select
                    label="Building use"
                    value={identity.projectType}
                    onChange={(e) => setIdentity((x) => ({ ...x, projectType: e.target.value }))}
                    fullWidth
                  >
                    {ProjectType.options.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    id="pi-work"
                    select
                    label="Work type"
                    value={identity.workType}
                    onChange={(e) => setIdentity((x) => ({ ...x, workType: e.target.value }))}
                    fullWidth
                  >
                    {ProjectWorkType.options.map((t) => (
                      <MenuItem key={t} value={t}>
                        {PROJECT_WORK_TYPE_LABEL[t]}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    id="pi-start"
                    label="Start date"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={identity.dateStart}
                    onChange={(e) => setIdentity((x) => ({ ...x, dateStart: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    id="pi-contract-value"
                    label="Contract value (₹)"
                    type="number"
                    placeholder="0"
                    helperText="Total fee/contract value for this project."
                    slotProps={{ htmlInput: { min: 0 } }}
                    value={identity.contractValueRupees}
                    onChange={(e) => setIdentity((x) => ({ ...x, contractValueRupees: e.target.value }))}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <div>
                <Button
                  variant="contained"
                  size="small"
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
              </div>
              <ProjectAppointment projectId={projectId} />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>2. Client &amp; occupants</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                id="bi-name"
                label="Client name"
                value={basic.clientName ?? ""}
                onChange={(e) => setBasic((x) => ({ ...x, clientName: e.target.value }))}
                fullWidth
              />
              <TextField
                id="bi-mobile"
                label="Mobile"
                value={basic.mobile ?? ""}
                onChange={(e) => setBasic((x) => ({ ...x, mobile: e.target.value }))}
                fullWidth
              />
              <TextField
                id="bi-email"
                label="Email"
                value={basic.email ?? ""}
                onChange={(e) => setBasic((x) => ({ ...x, email: e.target.value }))}
                fullWidth
              />
              <TextField
                id="occ-staff"
                label="Staff requirements"
                multiline
                rows={3}
                value={occupants.staffRequirements ?? ""}
                onChange={(e) => setOccupants((x) => ({ ...x, staffRequirements: e.target.value }))}
                fullWidth
              />
              <div>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    upsert.mutate({ projectId, section: "basicInfo", data: basic });
                    upsert.mutate({ projectId, section: "occupants", data: occupants });
                  }}
                >
                  Save client &amp; occupants
                </Button>
              </div>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>3. Site context</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                id="site-addr"
                label="Site address"
                value={identity.siteAddress}
                onChange={(e) => setIdentity((x) => ({ ...x, siteAddress: e.target.value }))}
                fullWidth
              />
              <TextField
                id="site-area"
                label="Site area (sq m)"
                value={identity.siteAreaSqm}
                onChange={(e) => setIdentity((x) => ({ ...x, siteAreaSqm: e.target.value }))}
                fullWidth
              />
              <TextField
                id="bi-terrain"
                label="Terrain & site notes"
                multiline
                rows={3}
                value={basic.terrain ?? ""}
                onChange={(e) => setBasic((x) => ({ ...x, terrain: e.target.value }))}
                fullWidth
              />
              <div>
                <Button
                  variant="contained"
                  size="small"
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
              </div>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>4. Design drivers</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                id="dg-style"
                label="Style & preferences"
                multiline
                rows={3}
                value={design.style ?? ""}
                onChange={(e) => setDesign((x) => ({ ...x, style: e.target.value }))}
                fullWidth
              />
              <TextField
                id="dg-activities"
                label="Important activities"
                multiline
                rows={3}
                value={design.activities ?? ""}
                onChange={(e) => setDesign((x) => ({ ...x, activities: e.target.value }))}
                fullWidth
              />
              <TextField
                id="dg-outdoor"
                label="Outdoor preferences"
                multiline
                rows={3}
                value={design.outdoorPrefs ?? ""}
                onChange={(e) => setDesign((x) => ({ ...x, outdoorPrefs: e.target.value }))}
                fullWidth
              />
              <div>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => upsert.mutate({ projectId, section: "designPrefs", data: design })}
                >
                  Save design drivers
                </Button>
              </div>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>5–7. Programme, materials, approval</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                id="pi-bua"
                label="Built-up area / programme notes"
                multiline
                rows={2}
                value={projInfo.intendedUse ?? ""}
                onChange={(e) => setProjInfo((x) => ({ ...x, intendedUse: e.target.value }))}
                fullWidth
              />
              <TextField
                id="mat-notes"
                label="Materials palette"
                multiline
                rows={3}
                value={materials.construction ?? ""}
                onChange={(e) => setMaterials((x) => ({ ...x, construction: e.target.value }))}
                fullWidth
              />
              <TextField
                id="assumptions"
                label="Assumptions & exclusions"
                multiline
                rows={3}
                value={assumptions}
                onChange={(e) => setAssumptions(e.target.value)}
                fullWidth
              />
              <TextField
                id="approval"
                label="Client approval note"
                multiline
                rows={2}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                fullWidth
              />
              <TextField
                id="approved-at"
                label="Approved on"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={approvedAt}
                onChange={(e) => setApprovedAt(e.target.value)}
                fullWidth
              />
              <div>
                <Button
                  variant="contained"
                  size="small"
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
                  Save programme &amp; approval
                </Button>
              </div>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </div>
    </Stack>
  );
}
