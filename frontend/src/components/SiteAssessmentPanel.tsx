import {
  Button,
  Checkbox,
  Column,
  Grid,
  InlineNotification,
  Modal,
  NumberInput,
  ProgressBar,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Tile,
  TextInput,
  Toggle,
} from "@carbon/react";
import {
  AssessmentPhase,
  ASSESSMENT_PHASE_LABEL,
  VIOLATION_STATUS_TAG,
  Topography,
  type ApprovalReadinessOutput,
  type AssessmentResult,
  type BasementOutput,
  type DevControlOutput,
  type RelaxationInputs,
  type SustainabilityOutput,
  type ViolationOutput,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "./DataState.js";
import { trpc } from "../lib/trpc.js";

interface RvRef {
  id: string;
  authority: string;
  district: string;
  buildingUse: string;
  effectiveDate: string;
}

interface Props {
  projectId: string;
  publishedVersions: RvRef[];
}

const BASEMENT_USES = ["PARKING", "UTILITIES", "STORAGE", "RETAIL", "GYM", "SERVICES", "MECHANICAL_PARKING"];

const EMPTY_RELAXATIONS: RelaxationInputs = {
  far: 0, groundCoverage: 0, height: 0,
  frontSetback: 0, rearSetback: 0, leftSetback: 0, rightSetback: 0,
  basementDepth: 0,
};

export function SiteAssessmentPanel({ projectId, publishedVersions }: Props) {
  const utils = trpc.useUtils();
  const assessmentsQ = trpc.siteAssessments.listByProject.useQuery({ projectId });
  const runMut = trpc.siteAssessments.run.useMutation({
    onSuccess: () => {
      utils.siteAssessments.listByProject.invalidate({ projectId });
      setFormOpen(false);
    },
  });
  const issueMut = trpc.siteAssessments.issue.useMutation({
    onSuccess: () => utils.siteAssessments.listByProject.invalidate({ projectId }),
  });
  const relaxMut = trpc.siteAssessments.setRelaxations.useMutation({
    onSuccess: () => utils.siteAssessments.listByProject.invalidate({ projectId }),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  // ── Form state ──
  const [ruleVersionId, setRuleVersionId] = useState(publishedVersions[0]?.id ?? "");
  const [assessmentPhase, setAssessmentPhase] = useState<AssessmentPhase>("PRE_DESIGN");
  const [siteArea, setSiteArea] = useState("");
  const [height, setHeight] = useState("11.5");
  const [builtUp, setBuiltUp] = useState("");
  const [excludedArea, setExcludedArea] = useState("0");
  const [plinthArea, setPlinthArea] = useState("");
  const [groundCoverPct, setGroundCoverPct] = useState("");
  const [topography, setTopography] = useState<string>("FLAT");
  const [approachRoad, setApproachRoad] = useState("0");
  const [sideForm, setSideForm] = useState({
    front: { abutsRoad: false, roadWidthM: "0", rblFromCentreM: "0" },
    rear: { abutsRoad: false, roadWidthM: "0", rblFromCentreM: "0" },
    left: { abutsRoad: false, roadWidthM: "0", rblFromCentreM: "0" },
    right: { abutsRoad: false, roadWidthM: "0", rblFromCentreM: "0" },
  });
  const [hasBasement, setHasBasement] = useState(false);
  const [basementDepth, setBasementDepth] = useState("0");
  const [basementHeight, setBasementHeight] = useState("2.5");
  const [basementUses, setBasementUses] = useState<string[]>([]);
  const [solarSqm, setSolarSqm] = useState("0");
  const [rainwaterLtr, setRainwaterLtr] = useState("0");
  const [evPct, setEvPct] = useState("0");
  const [greenCoverPct, setGreenCoverPct] = useState("0");
  const [treesPlanted, setTreesPlanted] = useState("0");
  const [existingPermits, setExistingPermits] = useState<string[]>([]);
  // POST_DESIGN actual setbacks
  const [actualFront, setActualFront] = useState("");
  const [actualRear, setActualRear] = useState("");
  const [actualLeft, setActualLeft] = useState("");
  const [actualRight, setActualRight] = useState("");

  const isPostDesign = assessmentPhase === "POST_DESIGN";

  const COMMON_DOCS = [
    { id: "ownership", label: "Title deed" },
    { id: "topo_survey", label: "Topographic survey" },
    { id: "site_plan", label: "Site plan" },
    { id: "building_plan", label: "Building plan" },
    { id: "structural_cert", label: "Structural certificate" },
    { id: "fire_noc", label: "Fire NOC" },
    { id: "khata", label: "Khata extract" },
    { id: "encumbrance", label: "Encumbrance certificate" },
    { id: "tax_receipts", label: "Tax receipts" },
    { id: "undertaking", label: "Undertaking" },
  ];

  function togglePermit(id: string) {
    setExistingPermits((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function toggleBasementUse(u: string) {
    setBasementUses((b) => (b.includes(u) ? b.filter((x) => x !== u) : [...b, u]));
  }
  function updateSide(name: string, field: string, value: string | boolean) {
    setSideForm((f) => ({ ...f, [name]: { ...f[name as keyof typeof f], [field]: value } }));
  }

  function buildSiteInputs() {
    const side = (name: string) => ({
      abutsRoad: sideForm[name as keyof typeof sideForm].abutsRoad,
      roadWidthM: Number(sideForm[name as keyof typeof sideForm].roadWidthM) || 0,
      rblFromCentreM: Number(sideForm[name as keyof typeof sideForm].rblFromCentreM) || 0,
    });
    return {
      buildingUse: publishedVersions.find((rv) => rv.id === ruleVersionId)?.buildingUse ?? "RESIDENTIAL",
      assessmentPhase,
      siteAreaSqm: Number(siteArea),
      proposedHeightM: Number(height),
      proposedBuiltUpSqm: builtUp ? Number(builtUp) : undefined,
      excludedAreaSqm: Number(excludedArea) || 0,
      proposedGroundCoverPct: groundCoverPct ? Number(groundCoverPct) : undefined,
      plinthAreaSqm: plinthArea ? Number(plinthArea) : undefined,
      topography: topography as "FLAT" | "UNDULATING" | "SLOPING" | "HILLY",
      approachRoadWidthM: Number(approachRoad) || 0,
      front: side("front"),
      rear: side("rear"),
      left: side("left"),
      right: side("right"),
      hasBasement,
      basementDepthM: Number(basementDepth) || 0,
      basementHeightM: Number(basementHeight) || 0,
      basementUses,
      solarPanelSqm: Number(solarSqm) || 0,
      rainwaterPitVolumeLtr: Number(rainwaterLtr) || 0,
      evChargingPct: Number(evPct) || 0,
      greenCoverPct: Number(greenCoverPct) || 0,
      treesPlanted: Number(treesPlanted) || 0,
      existingPermits,
      actualFrontSetbackM: isPostDesign && actualFront ? Number(actualFront) : undefined,
      actualRearSetbackM: isPostDesign && actualRear ? Number(actualRear) : undefined,
      actualLeftSetbackM: isPostDesign && actualLeft ? Number(actualLeft) : undefined,
      actualRightSetbackM: isPostDesign && actualRight ? Number(actualRight) : undefined,
    };
  }

  const viewRow = viewId ? (assessmentsQ.data ?? []).find((a) => a.id === viewId) : null;
  const scoreColor = (s: number) => (s >= 80 ? "green" : s >= 50 ? "blue" : "red");

  return (
    <>
      <Stack gap={4}>
        <Stack orientation="horizontal" gap={4}>
          <Stack gap={2} className="esti-grow">
            <h3>Site assessments</h3>
            <p>Each assessment runs all five RIE engines against a published rule set.</p>
          </Stack>
          {publishedVersions.length > 0 && (
            <Button onClick={() => setFormOpen(true)}>New assessment</Button>
          )}
        </Stack>

        <DataState
          loading={assessmentsQ.isLoading}
          isEmpty={(assessmentsQ.data ?? []).length === 0}
          columnCount={5}
          empty={{
            title: "No assessments yet",
            description:
              publishedVersions.length === 0
                ? "Publish a rule version first, then run an assessment."
                : "Run an assessment to generate the feasibility dashboard.",
            action:
              publishedVersions.length > 0 ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  New assessment
                </Button>
              ) : undefined,
          }}
        >
          <Grid>
            {(assessmentsQ.data ?? []).map((a) => (
              <Column key={a.id} sm={4} md={4} lg={8}>
                <Tile>
                  <Stack gap={3}>
                    <Stack orientation="horizontal" gap={3}>
                      <Tag type={a.status === "ISSUED" ? "green" : "gray"}>{a.status}</Tag>
                      <Tag type={(a.assessmentPhase ?? "PRE_DESIGN") === "POST_DESIGN" ? "blue" : "cool-gray"}>
                        {(a.assessmentPhase ?? "PRE_DESIGN") === "POST_DESIGN" ? "Post-design" : "Pre-design"}
                      </Tag>
                      {a.overallScore != null && (
                        <Tag type={scoreColor(a.overallScore)}>{a.overallScore}% overall</Tag>
                      )}
                    </Stack>
                    <p>
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <Stack orientation="horizontal" gap={3}>
                      <Button kind="ghost" size="sm" onClick={() => setViewId(a.id)}>
                        Feasibility dashboard
                      </Button>
                      {a.status !== "ISSUED" && (
                        <Button
                          kind="secondary"
                          size="sm"
                          disabled={issueMut.isPending}
                          onClick={() => issueMut.mutate({ id: a.id })}
                        >
                          Issue
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Tile>
              </Column>
            ))}
          </Grid>
        </DataState>
      </Stack>

      {/* ── Run assessment modal ── */}
      <Modal
        open={formOpen}
        modalHeading="New site assessment"
        primaryButtonText={runMut.isPending ? "Running…" : "Run assessment"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!siteArea || !ruleVersionId || runMut.isPending}
        onRequestClose={() => setFormOpen(false)}
        onRequestSubmit={() =>
          runMut.mutate({ projectId, ruleVersionId, siteInputs: buildSiteInputs() })
        }
        size="lg"
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="sa-rv"
              labelText="Rule version"
              value={ruleVersionId}
              onChange={(e) => setRuleVersionId(e.target.value)}
            >
              <SelectItem value="" text="— select rule version —" />
              {publishedVersions.map((rv) => (
                <SelectItem
                  key={rv.id}
                  value={rv.id}
                  text={`${rv.authority} · ${rv.district} · ${rv.buildingUse} (${rv.effectiveDate})`}
                />
              ))}
            </Select>
            <Select
              id="sa-phase"
              labelText="Assessment phase"
              value={assessmentPhase}
              onChange={(e) => setAssessmentPhase(e.target.value as AssessmentPhase)}
            >
              {AssessmentPhase.options.map((p) => (
                <SelectItem key={p} value={p} text={ASSESSMENT_PHASE_LABEL[p]} />
              ))}
            </Select>
          </Stack>

          <h4>Site inputs</h4>
          <Stack orientation="horizontal" gap={5}>
            <NumberInput
              id="sa-area"
              label="Site area (sq m)"
              value={siteArea}
              onChange={(_e, { value }) => setSiteArea(String(value))}
              min={1}
            />
            <NumberInput
              id="sa-height"
              label="Proposed height (m)"
              value={height}
              onChange={(_e, { value }) => setHeight(String(value))}
              min={1}
              step={0.5}
            />
            <Select
              id="sa-topo"
              labelText="Topography"
              value={topography}
              onChange={(e) => setTopography(e.target.value)}
            >
              {Topography.options.map((t) => (
                <SelectItem key={t} value={t} text={t.charAt(0) + t.slice(1).toLowerCase()} />
              ))}
            </Select>
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <NumberInput
              id="sa-bua"
              label="Gross built-up area (sq m, optional)"
              value={builtUp}
              onChange={(_e, { value }) => setBuiltUp(String(value))}
              min={0}
            />
            <NumberInput
              id="sa-excluded"
              label="FAR-excluded area (sq m)"
              helperText="Parking, stairs, lifts, machine rooms, balconies, etc."
              value={excludedArea}
              onChange={(_e, { value }) => setExcludedArea(String(value))}
              min={0}
            />
            <NumberInput
              id="sa-plinth"
              label="Plinth area (sq m, optional)"
              helperText="Used for rainwater harvesting trigger"
              value={plinthArea}
              onChange={(_e, { value }) => setPlinthArea(String(value))}
              min={0}
            />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <NumberInput
              id="sa-gc"
              label="Proposed ground cover (%)"
              value={groundCoverPct}
              onChange={(_e, { value }) => setGroundCoverPct(String(value))}
              min={0}
              max={100}
            />
            <NumberInput
              id="sa-approach"
              label="Approach road width (m)"
              value={approachRoad}
              onChange={(_e, { value }) => setApproachRoad(String(value))}
              min={0}
            />
          </Stack>

          <h4>Road-abutting sides</h4>
          {(["front", "rear", "left", "right"] as const).map((s) => (
            <Stack key={s} orientation="horizontal" gap={5}>
              <Checkbox
                id={`sa-${s}-road`}
                labelText={`${s.charAt(0).toUpperCase() + s.slice(1)} abuts road`}
                checked={sideForm[s].abutsRoad}
                onChange={(_e, { checked }) => updateSide(s, "abutsRoad", checked)}
              />
              {sideForm[s].abutsRoad && (
                <>
                  <NumberInput
                    id={`sa-${s}-w`}
                    label="Road width (m)"
                    value={sideForm[s].roadWidthM}
                    onChange={(_e, { value }) => updateSide(s, "roadWidthM", String(value))}
                    min={0}
                  />
                  <NumberInput
                    id={`sa-${s}-rbl`}
                    label="RBL from centre (m)"
                    value={sideForm[s].rblFromCentreM}
                    onChange={(_e, { value }) => updateSide(s, "rblFromCentreM", String(value))}
                    min={0}
                  />
                </>
              )}
            </Stack>
          ))}

          {isPostDesign && (
            <>
              <h4>Actual setbacks (POST_DESIGN)</h4>
              <Stack orientation="horizontal" gap={5}>
                {([
                  ["sa-af", "Front setback (m)", actualFront, setActualFront],
                  ["sa-ar", "Rear setback (m)", actualRear, setActualRear],
                  ["sa-al", "Left setback (m)", actualLeft, setActualLeft],
                  ["sa-arr", "Right setback (m)", actualRight, setActualRight],
                ] as [string, string, string, (v: string) => void][]).map(([id, label, val, setter]) => (
                  <TextInput
                    key={id}
                    id={id}
                    labelText={label}
                    type="number"
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    placeholder="m"
                  />
                ))}
              </Stack>
            </>
          )}

          <h4>Basement</h4>
          <Checkbox
            id="sa-basement"
            labelText="Project includes basement"
            checked={hasBasement}
            onChange={(_e, { checked }) => setHasBasement(checked)}
          />
          {hasBasement && (
            <>
              <Stack orientation="horizontal" gap={5}>
                <NumberInput
                  id="sa-bsdepth"
                  label="Basement depth (m)"
                  value={basementDepth}
                  onChange={(_e, { value }) => setBasementDepth(String(value))}
                  min={0}
                  step={0.5}
                />
                <NumberInput
                  id="sa-bsheight"
                  label="Clear height floor-to-ceiling (m)"
                  helperText="Min 2.4 m; max 2.75 m (3.6 m for mech. parking)"
                  value={basementHeight}
                  onChange={(_e, { value }) => setBasementHeight(String(value))}
                  min={0}
                  step={0.1}
                />
              </Stack>
              <Stack gap={2}>
                <p>Basement uses:</p>
                <Stack orientation="horizontal" gap={4}>
                  {BASEMENT_USES.map((u) => (
                    <Checkbox
                      key={u}
                      id={`sa-bsu-${u}`}
                      labelText={u.replace(/_/g, " ")}
                      checked={basementUses.includes(u)}
                      onChange={() => toggleBasementUse(u)}
                    />
                  ))}
                </Stack>
              </Stack>
            </>
          )}

          <h4>Sustainability provisions</h4>
          <Stack orientation="horizontal" gap={5}>
            <NumberInput id="sa-rw" label="Rainwater pit volume (litres)" value={rainwaterLtr} onChange={(_e, { value }) => setRainwaterLtr(String(value))} min={0} />
            <NumberInput id="sa-solar" label="Solar panel area (sq m)" value={solarSqm} onChange={(_e, { value }) => setSolarSqm(String(value))} min={0} />
            <NumberInput id="sa-ev" label="EV charging (% of parking)" value={evPct} onChange={(_e, { value }) => setEvPct(String(value))} min={0} max={100} />
            <NumberInput id="sa-greenpct" label="Green cover (% of site)" value={greenCoverPct} onChange={(_e, { value }) => setGreenCoverPct(String(value))} min={0} max={100} />
            <NumberInput id="sa-trees" label="Trees planted" helperText="≥ 2 required if site ≥ 200 sq m" value={treesPlanted} onChange={(_e, { value }) => setTreesPlanted(String(value))} min={0} />
          </Stack>

          <h4>Documents already in hand</h4>
          <Stack orientation="horizontal" gap={4}>
            {COMMON_DOCS.map((d) => (
              <Checkbox
                key={d.id}
                id={`sa-doc-${d.id}`}
                labelText={d.label}
                checked={existingPermits.includes(d.id)}
                onChange={() => togglePermit(d.id)}
              />
            ))}
          </Stack>

          {runMut.error && (
            <InlineNotification kind="error" title="Assessment failed" subtitle={runMut.error.message} />
          )}
        </Stack>
      </Modal>

      {/* ── Feasibility dashboard modal ── */}
      <Modal
        open={!!viewRow}
        modalHeading="Feasibility dashboard"
        primaryButtonText="Close"
        passiveModal
        onRequestClose={() => setViewId(null)}
        size="lg"
      >
        {viewRow && (
          <FeasibilityDashboard
            assessmentId={viewRow.id}
            assessmentPhase={(viewRow.assessmentPhase ?? "PRE_DESIGN") as "PRE_DESIGN" | "POST_DESIGN"}
            devControl={viewRow.devControl as DevControlOutput | null}
            basement={viewRow.basement as BasementOutput | null}
            sustainability={viewRow.sustainability as SustainabilityOutput | null}
            approvalReadiness={viewRow.approvalReadiness as ApprovalReadinessOutput | null}
            violations={viewRow.violations as ViolationOutput | null}
            savedRelaxations={(viewRow.relaxations as RelaxationInputs | null) ?? null}
            overallScore={viewRow.overallScore}
            onRelaxationSave={(rel) => relaxMut.mutate({ id: viewRow.id, relaxations: rel })}
            relaxSaving={relaxMut.isPending}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Feasibility dashboard ─────────────────────────────────────────────────

interface DashProps {
  assessmentId: string;
  assessmentPhase: "PRE_DESIGN" | "POST_DESIGN";
  devControl: DevControlOutput | null;
  basement: BasementOutput | null;
  sustainability: SustainabilityOutput | null;
  approvalReadiness: ApprovalReadinessOutput | null;
  violations: ViolationOutput | null;
  savedRelaxations: RelaxationInputs | null;
  overallScore: number | null;
  onRelaxationSave: (rel: RelaxationInputs) => void;
  relaxSaving: boolean;
}

function FeasibilityDashboard({
  assessmentPhase,
  devControl,
  basement,
  sustainability,
  approvalReadiness,
  violations,
  savedRelaxations,
  overallScore,
  onRelaxationSave,
  relaxSaving,
}: DashProps) {
  const scoreColor = (s: number) => (s >= 80 ? "green" : s >= 50 ? "blue" : "red");
  const passTag = (ok: boolean) => <Tag type={ok ? "green" : "red"}>{ok ? "Pass" : "Fail"}</Tag>;

  const [relaxations, setRelaxations] = useState<RelaxationInputs>(
    savedRelaxations ?? EMPTY_RELAXATIONS,
  );

  const isPostDesign = assessmentPhase === "POST_DESIGN";

  return (
    <Stack gap={6}>
      {overallScore != null && (
        <Tile>
          <Stack gap={3}>
            <Stack orientation="horizontal" gap={3}>
              <h3>Overall score</h3>
              <Tag type={scoreColor(overallScore)}>{overallScore}%</Tag>
              <Tag type={isPostDesign ? "blue" : "cool-gray"}>
                {isPostDesign ? "Post-design" : "Pre-design"}
              </Tag>
            </Stack>
            <ProgressBar label="Overall compliance score" value={overallScore} max={100} />
          </Stack>
        </Tile>
      )}

      <Tabs>
        <TabList aria-label="Assessment engines">
          <Tab>Development Control</Tab>
          <Tab>Basement</Tab>
          <Tab>Sustainability</Tab>
          <Tab>Approval Readiness</Tab>
          {isPostDesign && <Tab>Violations</Tab>}
        </TabList>
        <TabPanels>

          {/* Dev Control */}
          <TabPanel>
            {devControl ? (
              <Stack gap={4}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Development Control Engine</h4>
                  {passTag(devControl.compliant)}
                </Stack>
                <Grid>
                  <Column sm={4} md={4} lg={8}>
                    <Tile>
                      <Stack gap={3}>
                        <h4>FAR / Built-up area</h4>
                        <Stack orientation="horizontal" gap={3}>
                          <Tag type="cool-gray">Max FAR: {devControl.maxFar}</Tag>
                          {devControl.far > 0 && (
                            <Tag type={devControl.farUtilisedPct <= 100 ? "green" : "red"}>
                              Used: {devControl.farUtilisedPct}%
                            </Tag>
                          )}
                        </Stack>
                        <p>Max built-up: <strong>{devControl.maxBuiltUpSqm} sq m</strong></p>
                        {devControl.netBuiltUpSqm > 0 && (
                          <p>Net built-up (proposed): <strong>{devControl.netBuiltUpSqm} sq m</strong></p>
                        )}
                        <p>Max ground coverage: <strong>{devControl.maxCoveragePct}% ({devControl.maxFootprintSqm} sq m)</strong></p>
                        <p>Governing road: <strong>{devControl.governingRoadWidthM} m</strong></p>
                        {devControl.far > 0 && (
                          <ProgressBar label="FAR utilised" value={Math.min(devControl.farUtilisedPct, 100)} max={100} />
                        )}
                      </Stack>
                    </Tile>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <Tile>
                      <Stack gap={3}>
                        <h4>Setbacks (m) — required</h4>
                        <Stack orientation="horizontal" gap={3}>
                          <Tag type="cool-gray">Front: {devControl.setbacks.front}</Tag>
                          <Tag type="cool-gray">Rear: {devControl.setbacks.rear}</Tag>
                          <Tag type="cool-gray">Left: {devControl.setbacks.left}</Tag>
                          <Tag type="cool-gray">Right: {devControl.setbacks.right}</Tag>
                        </Stack>
                        <h4>Parking</h4>
                        <Stack orientation="horizontal" gap={3}>
                          <Tag type="blue">Car: {devControl.parking.carECS} ECS</Tag>
                          <Tag type="blue">2-wheeler: {devControl.parking.twoWheelerSlots}</Tag>
                          <Tag type="blue">Cycle: {devControl.parking.cycleSlots}</Tag>
                        </Stack>
                        <p>Max height: <strong>{devControl.maxHeightM} m</strong></p>
                      </Stack>
                    </Tile>
                  </Column>
                </Grid>
                {devControl.notes.length > 0 && (
                  <InlineNotification kind="warning" title="Notes" subtitle={devControl.notes.join(" • ")} />
                )}
              </Stack>
            ) : (
              <p>No data.</p>
            )}
          </TabPanel>

          {/* Basement */}
          <TabPanel>
            {basement ? (
              <Stack gap={4}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Basement Compliance Engine</h4>
                  {passTag(basement.compliant)}
                </Stack>
                <Grid>
                  <Column sm={4} md={4} lg={8}>
                    <Tile>
                      <Stack gap={3}>
                        <h4>Depth</h4>
                        <Stack orientation="horizontal" gap={3}>
                          <Tag type="cool-gray">Permitted: {basement.maxDepthM} m</Tag>
                          <Tag type={basement.depthCompliant ? "green" : "red"}>
                            Proposed: {basement.proposedDepthM} m
                          </Tag>
                        </Stack>
                        {basement.heightM > 0 && (
                          <>
                            <h4>Clear height</h4>
                            <Stack orientation="horizontal" gap={3}>
                              <Tag type="cool-gray">Min: {basement.minHeightM} m · Max: {basement.maxHeightM} m</Tag>
                              <Tag type={basement.heightCompliant ? "green" : "red"}>
                                Proposed: {basement.heightM} m
                              </Tag>
                            </Stack>
                          </>
                        )}
                        <p>Ventilation opening: min <strong>{basement.ventilationOpeningPct}%</strong> of wall area</p>
                      </Stack>
                    </Tile>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <Tile>
                      <Stack gap={3}>
                        <h4>Permitted uses</h4>
                        <Stack orientation="horizontal" gap={3}>
                          {basement.permittedUses.map((u) => (
                            <Tag key={u} type="cool-gray">{u}</Tag>
                          ))}
                        </Stack>
                        <h4>Proposed uses</h4>
                        <Stack orientation="horizontal" gap={3}>
                          {basement.proposedUses.map((u) => (
                            <Tag key={u} type={basement.permittedUses.includes(u) ? "green" : "red"}>
                              {u}
                            </Tag>
                          ))}
                        </Stack>
                      </Stack>
                    </Tile>
                  </Column>
                </Grid>
                {basement.notes.length > 0 && (
                  <InlineNotification kind="warning" title="Notes" subtitle={basement.notes.join(" • ")} />
                )}
              </Stack>
            ) : (
              <p>No basement specified for this project.</p>
            )}
          </TabPanel>

          {/* Sustainability */}
          <TabPanel>
            {sustainability ? (
              <Stack gap={4}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Sustainability Compliance Engine</h4>
                  {passTag(sustainability.compliant)}
                  <Tag type="blue">Score: {sustainability.score}%</Tag>
                </Stack>
                <ProgressBar label="Sustainability score" value={sustainability.score} max={100} />
                <Grid>
                  <Column sm={4} md={2} lg={4}>
                    <Tile>
                      <Stack gap={2}>
                        <h4>Rainwater harvesting</h4>
                        {!sustainability.rainwater.triggered ? (
                          <Tag type="gray">Not triggered (plinth ≤ 100 sqm or site &lt; 200 sqm)</Tag>
                        ) : (
                          <>
                            {passTag(sustainability.rainwater.compliant)}
                            <p>Required: {sustainability.rainwater.required} L</p>
                            <p>Provided: {sustainability.rainwater.provided} L</p>
                          </>
                        )}
                        {sustainability.rainwater.clause && (
                          <p>{sustainability.rainwater.clause}</p>
                        )}
                      </Stack>
                    </Tile>
                  </Column>
                  <Column sm={4} md={2} lg={4}>
                    <Tile>
                      <Stack gap={2}>
                        <h4>Solar panels</h4>
                        {passTag(sustainability.solar.compliant)}
                        <p>Required: {sustainability.solar.required} sq m</p>
                        <p>Provided: {sustainability.solar.provided} sq m</p>
                        {sustainability.solar.clause && <p>{sustainability.solar.clause}</p>}
                      </Stack>
                    </Tile>
                  </Column>
                  <Column sm={4} md={2} lg={4}>
                    <Tile>
                      <Stack gap={2}>
                        <h4>EV charging</h4>
                        {passTag(sustainability.evCharging.compliant)}
                        <p>Required: {sustainability.evCharging.requiredPct}% of parking</p>
                        <p>Provided: {sustainability.evCharging.providedPct}%</p>
                        {sustainability.evCharging.clause && <p>{sustainability.evCharging.clause}</p>}
                      </Stack>
                    </Tile>
                  </Column>
                  <Column sm={4} md={2} lg={4}>
                    <Tile>
                      <Stack gap={2}>
                        <h4>Green cover</h4>
                        {passTag(sustainability.greenCover.compliant)}
                        <p>Required: {sustainability.greenCover.requiredPct}% of site</p>
                        <p>Provided: {sustainability.greenCover.providedPct}%</p>
                        {sustainability.greenCover.clause && <p>{sustainability.greenCover.clause}</p>}
                      </Stack>
                    </Tile>
                  </Column>
                  <Column sm={4} md={2} lg={4}>
                    <Tile>
                      <Stack gap={2}>
                        <h4>Tree planting</h4>
                        {passTag(sustainability.trees.compliant)}
                        <p>Required: {sustainability.trees.required} trees</p>
                        <p>Provided: {sustainability.trees.provided} trees</p>
                      </Stack>
                    </Tile>
                  </Column>
                </Grid>
              </Stack>
            ) : (
              <p>No data.</p>
            )}
          </TabPanel>

          {/* Approval Readiness */}
          <TabPanel>
            {approvalReadiness ? (
              <Stack gap={4}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Approval Readiness Engine</h4>
                  <Tag
                    type={
                      approvalReadiness.readiness === "READY"
                        ? "green"
                        : approvalReadiness.readiness === "PARTIAL"
                          ? "blue"
                          : "red"
                    }
                  >
                    {approvalReadiness.readiness === "READY"
                      ? "Ready"
                      : approvalReadiness.readiness === "PARTIAL"
                        ? "Partial"
                        : "Not ready"}
                  </Tag>
                  <Tag type="cool-gray">
                    {approvalReadiness.requiredPresent}/{approvalReadiness.requiredTotal} required docs
                  </Tag>
                </Stack>
                <ProgressBar label="Approval readiness score" value={approvalReadiness.score} max={100} />
                <Stack gap={2}>
                  {approvalReadiness.items.map((item) => (
                    <Stack key={item.id} orientation="horizontal" gap={3}>
                      <Tag type={item.present ? "green" : item.required ? "red" : "gray"}>
                        {item.present ? "Present" : "Missing"}
                      </Tag>
                      <span>{item.label}</span>
                      {item.required && !item.present && <Tag type="warm-gray">Required</Tag>}
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            ) : (
              <p>No data.</p>
            )}
          </TabPanel>

          {/* Violations (POST_DESIGN only) */}
          {isPostDesign && (
            <TabPanel>
              <Stack gap={5}>
                <Stack orientation="horizontal" gap={3}>
                  <h4>Violation / Deviation Analysis</h4>
                  {violations?.hasViolations ? (
                    <Tag type="red">Violations present</Tag>
                  ) : violations?.hasRelaxations ? (
                    <Tag type="blue">Within relaxations</Tag>
                  ) : (
                    <Tag type="green">All compliant</Tag>
                  )}
                </Stack>

                {(!violations || violations.items.length === 0) ? (
                  <p>
                    No actual setback or dimensional values were entered. Re-run as POST_DESIGN with
                    actual values to see the deviation analysis.
                  </p>
                ) : (
                  <Stack gap={3}>
                    {violations.items.map((item) => (
                      <Tile key={item.parameter}>
                        <Stack orientation="horizontal" gap={4}>
                          <Stack gap={1} className="esti-grow">
                            <p>
                              <strong>{item.label}</strong>
                            </p>
                            <p>
                              {item.limitType === "MAX" ? "Permissible max" : "Required min"}:{" "}
                              <strong>
                                {item.permissible} {item.unit}
                              </strong>
                              {item.relaxation > 0 && (
                                <> + relaxation {item.relaxation} {item.unit} = effective {item.effectiveLimit} {item.unit}</>
                              )}
                            </p>
                            <p>
                              Actual: <strong>{item.actual} {item.unit}</strong>
                              {item.deviation !== 0 && (
                                <> · deviation {item.deviation > 0 ? "+" : ""}{item.deviation.toFixed(2)} {item.unit} ({item.deviationPct}%)</>
                              )}
                            </p>
                          </Stack>
                          <Tag type={VIOLATION_STATUS_TAG[item.status]}>
                            {item.status === "COMPLIANT"
                              ? "Compliant"
                              : item.status === "WITHIN_RELAXATION"
                                ? "Within relaxation"
                                : "Violation"}
                          </Tag>
                        </Stack>
                      </Tile>
                    ))}
                  </Stack>
                )}

                {/* Relaxation inputs */}
                <Tile>
                  <Stack gap={4}>
                    <h4>Relaxation inputs</h4>
                    <p>
                      Enter any authority-approved relaxation amounts. Saving re-computes violation
                      status using effective limits (permissible ± relaxation).
                    </p>
                    <Grid>
                      {([
                        ["far", "FAR relaxation", "FAR"],
                        ["groundCoverage", "Ground coverage (%)", "%"],
                        ["height", "Height (m)", "m"],
                        ["frontSetback", "Front setback (m)", "m"],
                        ["rearSetback", "Rear setback (m)", "m"],
                        ["leftSetback", "Left setback (m)", "m"],
                        ["rightSetback", "Right setback (m)", "m"],
                        ["basementDepth", "Basement depth (m)", "m"],
                      ] as [keyof RelaxationInputs, string, string][]).map(([key, label]) => (
                        <Column key={key} sm={2} md={2} lg={4}>
                          <TextInput
                            id={`relax-${key}`}
                            labelText={label}
                            type="number"
                            value={String(relaxations[key] ?? 0)}
                            onChange={(e) =>
                              setRelaxations((r) => ({
                                ...r,
                                [key]: Number(e.target.value) || 0,
                              }))
                            }
                          />
                        </Column>
                      ))}
                    </Grid>
                    <Button
                      kind="secondary"
                      size="sm"
                      disabled={relaxSaving}
                      onClick={() => onRelaxationSave(relaxations)}
                    >
                      {relaxSaving ? "Saving…" : "Save relaxations & recompute"}
                    </Button>
                  </Stack>
                </Tile>
              </Stack>
            </TabPanel>
          )}

        </TabPanels>
      </Tabs>
    </Stack>
  );
}
