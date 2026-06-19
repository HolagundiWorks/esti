import {
  Button,
  InlineNotification,
  Stack,
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
  Checkbox,
} from "@carbon/react";
import {
  type BylawEnvelope,
  type PostConstructionActuals,
  type PostConstructionAudit,
  type PreConstructionPotential,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectBylawCalc } from "./ProjectBylawCalc.js";
import { ProjectPermits } from "./ProjectPermits.js";
import { trpc } from "../lib/trpc.js";

const AUDIT_STATUS_TAG: Record<string, "green" | "red" | "gray"> = {
  passed: "green",
  failed: "red",
  not_evaluated: "gray",
};

type StoredBylawResult = BylawEnvelope & { preConstruction?: Partial<PreConstructionPotential> };

/** Merge nested preConstruction with legacy flat envelope fields (demo / older saves). */
function normalizePreConstruction(envelope: StoredBylawResult | undefined): PreConstructionPotential | null {
  if (!envelope) return null;

  const nested = envelope.preConstruction;
  const farAllowed = nested?.farAllowed ?? envelope.farAllowed ?? envelope.far;
  if (farAllowed == null || Number.isNaN(Number(farAllowed))) return null;

  const setbacks = nested?.setbacks ?? envelope.setbacks;
  const parking = nested?.parking ?? envelope.parking;
  if (!setbacks?.front || !parking) return null;

  const secondaryRequirements =
    nested?.secondaryRequirements ??
    envelope.secondaryCompliance ?? {
      rainwaterHarvesting: false,
      solarWaterHeating: false,
      treePlanting: false,
      earthquakeDesign: false,
    };

  return {
    farAllowed: Number(farAllowed),
    permissibleBuiltup: Number(
      nested?.permissibleBuiltup ?? envelope.permissibleBuiltup ?? envelope.maxBuiltUpSqm ?? 0,
    ),
    coverageAllowed: Number(
      nested?.coverageAllowed ?? envelope.coverageAllowed ?? envelope.coveragePct ?? 0,
    ),
    maxFootprint: Number(
      nested?.maxFootprint ?? envelope.maxFootprint ?? envelope.maxFootprintSqm ?? 0,
    ),
    setbacks,
    parking,
    basementAllowed: nested?.basementAllowed ?? envelope.basementAllowed ?? false,
    secondaryRequirements,
    governingRoadWidthM: Number(
      nested?.governingRoadWidthM ?? envelope.governingRoadWidthM ?? 0,
    ),
    notes: nested?.notes ?? envelope.notes ?? [],
    calculationTrace: nested?.calculationTrace ?? envelope.calculationTrace,
  };
}

function formatRatio(value: number | undefined): string {
  return value != null && !Number.isNaN(value) ? value.toFixed(2) : "—";
}

export function ProjectBylawData({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery({ id: projectId }, { enabled: !!projectId });
  const calcQ = trpc.bylawCalc.getByProject.useQuery({ projectId }, { enabled: !!projectId });
  const assessmentsQ = trpc.siteAssessments.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const [actuals, setActuals] = useState({
    totalFloorAreaSqm: "",
    exemptAreaSqm: "0",
    groundFootprintSqm: "",
    groundCoverPct: "",
    actualFrontSetbackM: "",
    actualRearSetbackM: "",
    actualLeftSetbackM: "",
    actualRightSetbackM: "",
    providedParkingEcs: "",
    treesPlanted: "0",
    hasBasement: false,
    basementHeightM: "0",
    basementMechanicalParking: false,
  });

  useEffect(() => {
    const saved = calcQ.data?.postconstructionInput as PostConstructionActuals | undefined;
    if (!saved) return;
    setActuals({
      totalFloorAreaSqm: String(saved.totalFloorAreaSqm ?? ""),
      exemptAreaSqm: String(saved.exemptAreaSqm ?? 0),
      groundFootprintSqm: saved.groundFootprintSqm != null ? String(saved.groundFootprintSqm) : "",
      groundCoverPct: saved.groundCoverPct != null ? String(saved.groundCoverPct) : "",
      actualFrontSetbackM:
        saved.actualFrontSetbackM != null ? String(saved.actualFrontSetbackM) : "",
      actualRearSetbackM:
        saved.actualRearSetbackM != null ? String(saved.actualRearSetbackM) : "",
      actualLeftSetbackM:
        saved.actualLeftSetbackM != null ? String(saved.actualLeftSetbackM) : "",
      actualRightSetbackM:
        saved.actualRightSetbackM != null ? String(saved.actualRightSetbackM) : "",
      providedParkingEcs:
        saved.providedParkingEcs != null ? String(saved.providedParkingEcs) : "",
      treesPlanted: String(saved.treesPlanted ?? 0),
      hasBasement: saved.hasBasement ?? false,
      basementHeightM: String(saved.basementHeightM ?? 0),
      basementMechanicalParking: saved.basementMechanicalParking ?? false,
    });
  }, [calcQ.data?.postconstructionInput]);

  const savePost = trpc.bylawCalc.savePostConstruction.useMutation({
    onSuccess: () => utils.bylawCalc.getByProject.invalidate({ projectId }),
  });

  const envelope = calcQ.data?.result as StoredBylawResult | undefined;
  const pre = normalizePreConstruction(envelope);
  const audit = calcQ.data?.postconstructionAudit as PostConstructionAudit | undefined;
  const issuedAssessment = (assessmentsQ.data ?? []).find((a) => a.status === "ISSUED");

  function buildActuals(): PostConstructionActuals | null {
    const total = Number(actuals.totalFloorAreaSqm);
    if (!total || total <= 0) return null;
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    return {
      totalFloorAreaSqm: total,
      exemptAreaSqm: Number(actuals.exemptAreaSqm) || 0,
      groundFootprintSqm: num(actuals.groundFootprintSqm),
      groundCoverPct: num(actuals.groundCoverPct),
      actualFrontSetbackM: num(actuals.actualFrontSetbackM),
      actualRearSetbackM: num(actuals.actualRearSetbackM),
      actualLeftSetbackM: num(actuals.actualLeftSetbackM),
      actualRightSetbackM: num(actuals.actualRightSetbackM),
      providedParkingEcs: num(actuals.providedParkingEcs),
      treesPlanted: Number(actuals.treesPlanted) || 0,
      hasBasement: actuals.hasBasement,
      basementHeightM: Number(actuals.basementHeightM) || 0,
      basementMechanicalParking: actuals.basementMechanicalParking,
      basementProjectionAboveGroundM: 0,
    };
  }

  async function runPostAudit() {
    const payload = buildActuals();
    if (!payload) return;
    await savePost.mutateAsync({ projectId, actuals: payload });
  }

  const p = projectQ.data;

  return (
    <Stack gap={6}>
      {!embedded && (
        <div>
          <h2>Project data — bylaw compliance</h2>
          <p>
            Pre-construction development potential and post-construction violation checking use the
            jurisdiction rule sets from Knowledge Bank → Compliance.
          </p>
        </div>
      )}

      <Tile>
        <h3>Site information</h3>
        <Stack gap={3} style={{ marginTop: 8 }}>
          <p>
            <strong>Site area:</strong>{" "}
            {p?.siteAreaSqm ? `${p.siteAreaSqm} sq m` : "Not set — enter in pre-construction below"}
          </p>
          <p>
            <strong>Address:</strong> {p?.siteAddress ?? "—"}
          </p>
          <p>
            <strong>Jurisdiction:</strong> {p?.jurisdiction ?? "—"}
            {p?.district ? ` · ${p.district}` : ""}
          </p>
          {calcQ.data?.precomputedAt && (
            <p className="esti-label">
              Pre-construction last computed:{" "}
              {new Date(calcQ.data.precomputedAt as unknown as string).toLocaleString()}
            </p>
          )}
        </Stack>
      </Tile>

      <Tile>
        <h3>Pre-construction development potential</h3>
        <p>How much can be legally built — no violation detection.</p>
        {pre ? (
          <PreConstructionSummary pre={pre} />
        ) : (
          <InlineNotification
            kind="info"
            title="Not computed yet"
            subtitle="Enter site and building parameters below, then save."
            hideCloseButton
            lowContrast
            style={{ marginTop: 12 }}
          />
        )}
        <div style={{ marginTop: 16 }}>
          <ProjectBylawCalc projectId={projectId} embedded showFarTable={false} />
        </div>
      </Tile>

      <Tile>
        <h3>Post-construction compliance / violations</h3>
        <p>Compare actual built or drawing values against allowed limits.</p>
        {!calcQ.data?.input && (
          <InlineNotification
            kind="warning"
            title="Pre-construction required"
            subtitle="Save development potential first — allowed values come from that calculation."
            hideCloseButton
            lowContrast
            style={{ marginTop: 12 }}
          />
        )}
        <Stack gap={4} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <TextInput
              id="post-bua"
              labelText="Actual gross built-up (sq m)"
              type="number"
              value={actuals.totalFloorAreaSqm}
              onChange={(e) => setActuals((a) => ({ ...a, totalFloorAreaSqm: e.target.value }))}
            />
            <TextInput
              id="post-exempt"
              labelText="FAR-exempt area (sq m)"
              type="number"
              value={actuals.exemptAreaSqm}
              onChange={(e) => setActuals((a) => ({ ...a, exemptAreaSqm: e.target.value }))}
            />
            <TextInput
              id="post-footprint"
              labelText="Actual ground footprint (sq m)"
              type="number"
              value={actuals.groundFootprintSqm}
              onChange={(e) => setActuals((a) => ({ ...a, groundFootprintSqm: e.target.value }))}
            />
            <TextInput
              id="post-cover"
              labelText="Actual ground cover (%)"
              type="number"
              value={actuals.groundCoverPct}
              onChange={(e) => setActuals((a) => ({ ...a, groundCoverPct: e.target.value }))}
            />
            <TextInput
              id="post-parking"
              labelText="Parking provided (ECS)"
              type="number"
              value={actuals.providedParkingEcs}
              onChange={(e) => setActuals((a) => ({ ...a, providedParkingEcs: e.target.value }))}
            />
          </div>
          <TableContainer title="Actual setbacks (m)" description="Minimum required values from pre-construction">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Front</TableHeader>
                  <TableHeader>Rear</TableHeader>
                  <TableHeader>Left</TableHeader>
                  <TableHeader>Right</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  {(["actualFrontSetbackM", "actualRearSetbackM", "actualLeftSetbackM", "actualRightSetbackM"] as const).map(
                    (key) => (
                      <TableCell key={key}>
                        <TextInput
                          id={`post-${key}`}
                          labelText={key}
                          hideLabel
                          size="sm"
                          type="number"
                          value={actuals[key]}
                          onChange={(e) => setActuals((a) => ({ ...a, [key]: e.target.value }))}
                        />
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Checkbox
            id="post-basement"
            labelText="Has basement"
            checked={actuals.hasBasement}
            onChange={(_, { checked }) => setActuals((a) => ({ ...a, hasBasement: checked }))}
          />
          {actuals.hasBasement && (
            <TextInput
              id="post-basement-h"
              labelText="Basement height (m)"
              type="number"
              value={actuals.basementHeightM}
              onChange={(e) => setActuals((a) => ({ ...a, basementHeightM: e.target.value }))}
            />
          )}
          <Button
            disabled={!calcQ.data?.input || savePost.isPending || !actuals.totalFloorAreaSqm}
            onClick={runPostAudit}
          >
            {savePost.isPending ? "Auditing…" : "Run compliance audit & save"}
          </Button>
        </Stack>
        {audit && (
          <div style={{ marginTop: 16 }}>
            <PostConstructionAuditTable audit={audit} />
            {calcQ.data?.postcomputedAt && (
              <p className="esti-label" style={{ marginTop: 8 }}>
                Last audit:{" "}
                {new Date(calcQ.data.postcomputedAt as unknown as string).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Tile>

      <Tile>
        <h3>Statutory permits</h3>
        <p>BPAS, RERA, Fire NOC, and other permit records for this project.</p>
        <div style={{ marginTop: 12 }}>
          <ProjectPermits projectId={projectId} />
        </div>
      </Tile>

      <Tile>
        <h3>Site feasibility &amp; compliance PDF</h3>
        {issuedAssessment?.pdfKey ? (
          <Stack gap={3}>
            <p style={{ margin: 0 }}>
              Latest issued site assessment PDF — status: {issuedAssessment.pdfStatus}
            </p>
            <Button
              kind="tertiary"
              as={Link}
              to={`/knowledge-bank?tab=compliance&project=${projectId}`}
            >
              Open site assessments in Knowledge Bank
            </Button>
          </Stack>
        ) : (
          <Stack gap={3}>
            <p style={{ margin: 0 }}>
              No compliance PDF issued yet. Run a site feasibility assessment in{" "}
              <Link to={`/knowledge-bank?tab=compliance&project=${projectId}`}>
                Knowledge Bank → Compliance
              </Link>{" "}
              and issue to generate a branded PDF.
            </p>
          </Stack>
        )}
      </Tile>
    </Stack>
  );
}

function PreConstructionSummary({ pre }: { pre: PreConstructionPotential }) {
  const sec = pre.secondaryRequirements;
  return (
    <TableContainer
      title="Allowed development envelope"
      description="From jurisdiction development-control rules"
      style={{ marginTop: 12 }}
    >
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Parameter</TableHeader>
            <TableHeader>Allowed value</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Allowed FAR</TableCell>
            <TableCell>{formatRatio(pre.farAllowed)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Permissible built-up area</TableCell>
            <TableCell>
              {pre.permissibleBuiltup != null ? `${pre.permissibleBuiltup} sq m` : "—"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Allowed coverage</TableCell>
            <TableCell>
              {pre.coverageAllowed != null ? `${pre.coverageAllowed}%` : "—"}
              {pre.maxFootprint != null ? ` · max footprint ${pre.maxFootprint} sq m` : ""}
            </TableCell>
          </TableRow>
          {(["front", "rear", "left", "right"] as const).map((side) => {
            const setback = pre.setbacks?.[side];
            if (!setback) return null;
            return (
            <TableRow key={side}>
              <TableCell>{side.charAt(0).toUpperCase() + side.slice(1)} setback</TableCell>
              <TableCell>
                {setback.value} m{" "}
                <Tag type={setback.governedBy === "RBL" ? "red" : "blue"} size="sm">
                  {setback.governedBy}
                </Tag>
              </TableCell>
            </TableRow>
            );
          })}
          <TableRow>
            <TableCell>Required parking</TableCell>
            <TableCell>
              {pre.parking
                ? `${pre.parking.total} ECS (${pre.parking.requiredECS} + ${pre.parking.visitorECS} visitor)`
                : "—"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Basement</TableCell>
            <TableCell>{pre.basementAllowed ? "Permitted (subject to height rules)" : "—"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>RWH requirement</TableCell>
            <TableCell>
              <Tag type={sec.rainwaterHarvesting ? "green" : "gray"} size="sm">
                {sec.rainwaterHarvesting ? "Required" : "Not triggered"}
              </Tag>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Solar requirement</TableCell>
            <TableCell>
              <Tag type={sec.solarWaterHeating ? "green" : "gray"} size="sm">
                {sec.solarWaterHeating ? "Required" : "Not triggered"}
              </Tag>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Tree requirement</TableCell>
            <TableCell>
              <Tag type={sec.treePlanting ? "green" : "gray"} size="sm">
                {sec.treePlanting ? "Met" : "Not met / not triggered"}
              </Tag>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Seismic requirement</TableCell>
            <TableCell>
              <Tag type={sec.earthquakeDesign ? "green" : "gray"} size="sm">
                {sec.earthquakeDesign ? "Required (IS 1893)" : "Not triggered"}
              </Tag>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function PostConstructionAuditTable({ audit }: { audit: PostConstructionAudit }) {
  return (
    <>
      <Stack orientation="horizontal" gap={3} style={{ marginBottom: 8 }}>
        <Tag
          type={
            audit.overallStatus === "compliant"
              ? "green"
              : audit.overallStatus === "non_compliant"
                ? "red"
                : "gray"
          }
        >
          {audit.overallStatus === "compliant"
            ? "Compliant"
            : audit.overallStatus === "non_compliant"
              ? "Violations found"
              : "Incomplete — enter more actual values"}
        </Tag>
      </Stack>
      <TableContainer title="Violation summary">
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Rule</TableHeader>
              <TableHeader>Allowed</TableHeader>
              <TableHeader>Actual</TableHeader>
              <TableHeader>Difference</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Reason</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(audit.parameters).map(([key, row]) => (
              <TableRow key={key}>
                <TableCell>{row.label}</TableCell>
                <TableCell>
                  {row.unit ? `${row.allowed} ${row.unit}` : row.allowed ? "Yes" : "—"}
                </TableCell>
                <TableCell>
                  {row.actual != null
                    ? row.unit
                      ? `${row.actual} ${row.unit}`
                      : String(row.actual)
                    : "—"}
                </TableCell>
                <TableCell>
                  {row.violation != null
                    ? row.unit
                      ? `${row.violation} ${row.unit}`
                      : String(row.violation)
                    : "—"}
                </TableCell>
                <TableCell>
                  <Tag type={AUDIT_STATUS_TAG[row.status] ?? "gray"} size="sm">
                    {row.status}
                  </Tag>
                </TableCell>
                <TableCell>
                  {row.reason ?? row.governedBy ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
