import {
  Button,
  Checkbox,
  Select,
  SelectItem,
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
} from "@carbon/react";
import {
  BUILDING_TYPE_LABEL,
  BuildingType,
  DEVELOPMENT_AREA_LABEL,
  DevelopmentArea,
  ROAD_CLASS_LABEL,
  RoadClass,
  type BylawCalcInput,
  type BylawEnvelope,
  computeBylawEnvelope,
  DEFAULT_BBMP_RULE_CATALOG,
  type BbmpRuleCatalog,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { BbmpFarRuleTable } from "./knowledge/BbmpFarRuleTable.js";
import { trpc } from "../lib/trpc.js";

type Side = {
  abutsRoad: boolean;
  roadWidthM: string;
  roadClass: (typeof RoadClass.options)[number];
  distanceCentreToBoundaryM: string;
};
const emptySide = (): Side => ({
  abutsRoad: false,
  roadWidthM: "",
  roadClass: "LOCAL",
  distanceCentreToBoundaryM: "",
});
const SIDES = ["front", "rear", "left", "right"] as const;

export function ProjectBylawCalc({
  projectId,
  embedded = false,
  showFarTable = true,
}: {
  projectId: string;
  embedded?: boolean;
  showFarTable?: boolean;
}) {
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );
  const savedQ = trpc.bylawCalc.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const bbmpCatalogQ = trpc.bbmpRules.activeCatalog.useQuery();
  const ruleCatalog: BbmpRuleCatalog =
    bbmpCatalogQ.data?.catalog ?? DEFAULT_BBMP_RULE_CATALOG;

  const [buildingType, setBuildingType] =
    useState<(typeof BuildingType.options)[number]>("RESIDENTIAL");
  const [developmentArea, setDevelopmentArea] =
    useState<(typeof DevelopmentArea.options)[number]>("A");
  const [siteArea, setSiteArea] = useState("");
  const [plotWidth, setPlotWidth] = useState("");
  const [plotDepth, setPlotDepth] = useState("");
  const [height, setHeight] = useState("9");
  const [floorCount, setFloorCount] = useState("2");
  const [dwellingUnits, setDwellingUnits] = useState("1");
  const [unitArea, setUnitArea] = useState("120");
  const [sides, setSides] = useState<Record<string, Side>>({
    front: emptySide(),
    rear: emptySide(),
    left: emptySide(),
    right: emptySide(),
  });
  const [preview, setPreview] = useState<BylawEnvelope | null>(null);

  useEffect(() => {
    const saved = savedQ.data?.input as BylawCalcInput | undefined;
    if (saved) {
      setBuildingType(saved.buildingType);
      setDevelopmentArea(saved.developmentArea ?? "A");
      setSiteArea(String(saved.siteAreaSqm));
      setPlotWidth(saved.plotWidthM ? String(saved.plotWidthM) : "");
      setPlotDepth(saved.plotDepthM ? String(saved.plotDepthM) : "");
      setHeight(String(saved.proposedHeightM));
      setFloorCount(String(saved.floorCount ?? 2));
      setDwellingUnits(String(saved.dwellingUnits ?? 1));
      setUnitArea(String(saved.unitAreaSqm ?? 120));
      setSides({
        front: toSide(saved.front),
        rear: toSide(saved.rear),
        left: toSide(saved.left),
        right: toSide(saved.right),
      });
      setPreview((savedQ.data?.result as BylawEnvelope) ?? null);
    } else if (projectQ.data?.siteAreaSqm) {
      setSiteArea(String(projectQ.data.siteAreaSqm));
      const side = Math.sqrt(projectQ.data.siteAreaSqm);
      setPlotWidth(String(Math.round(side * 10) / 10));
      setPlotDepth(String(Math.round(side * 10) / 10));
    }
  }, [savedQ.data, projectQ.data]);

  const updateSite = trpc.projectOffice.updateSite.useMutation();
  const save = trpc.bylawCalc.save.useMutation({
    onSuccess: (row) => {
      setPreview(row.result as BylawEnvelope);
      utils.bylawCalc.getByProject.invalidate({ projectId });
      utils.projectOffice.byId.invalidate({ id: projectId });
    },
  });

  function buildInput(): BylawCalcInput | null {
    const area = Number(siteArea);
    if (!area || area <= 0) return null;
    const side = (s: Side) => ({
      abutsRoad: s.abutsRoad,
      roadWidthM: Number(s.roadWidthM) || 0,
      roadClass: s.roadClass,
      distanceCentreToBoundaryM: Number(s.distanceCentreToBoundaryM) || 0,
      ...(Number(s.distanceCentreToBoundaryM) === 0 ? {} : {}),
    });
    return {
      buildingType,
      developmentArea,
      siteAreaSqm: area,
      plotWidthM: plotWidth ? Number(plotWidth) : undefined,
      plotDepthM: plotDepth ? Number(plotDepth) : undefined,
      proposedHeightM: Number(height) || 9,
      floorCount: Number(floorCount) || 2,
      dwellingUnits: Number(dwellingUnits) || 1,
      unitAreaSqm: Number(unitArea) || 120,
      front: side(sides.front!),
      rear: side(sides.rear!),
      left: side(sides.left!),
      right: side(sides.right!),
    };
  }

  useEffect(() => {
    const input = buildInput();
    setPreview(input ? computeBylawEnvelope(input, ruleCatalog) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    buildingType,
    developmentArea,
    siteArea,
    plotWidth,
    plotDepth,
    height,
    floorCount,
    dwellingUnits,
    unitArea,
    sides,
    ruleCatalog,
  ]);

  const governingRoadWidthM = useMemo(() => {
    const widths = SIDES.filter((name) => sides[name]!.abutsRoad)
      .map((name) => Number(sides[name]!.roadWidthM) || 0)
      .filter((w) => w > 0);
    return widths.length ? Math.max(...widths) : 0;
  }, [sides]);

  function setSide(name: string, patch: Partial<Side>) {
    setSides((p) => ({ ...p, [name]: { ...p[name]!, ...patch } }));
  }

  async function persist() {
    const input = buildInput();
    if (!input) return;
    await updateSite.mutateAsync({
      id: projectId,
      siteAreaSqm: input.siteAreaSqm,
    });
    save.mutate({ projectId, input });
  }

  return (
    <>
      {!embedded && (
        <>
          <h3>Development controls calculator</h3>
          <p>
            BBMP Building Bye-Laws 2003 engine — zone, FAR, Table 4/5 setbacks, RBL,
            and parking per <code>BYLAWS-BBMP.md</code>.
          </p>
        </>
      )}
      <Tile style={{ marginTop: 8 }}>
        <Stack gap={5}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Select
              id="bc-zone"
              labelText="Development zone"
              value={developmentArea}
              onChange={(e) =>
                setDevelopmentArea(e.target.value as (typeof DevelopmentArea.options)[number])
              }
            >
              {DevelopmentArea.options.map((z) => (
                <SelectItem key={z} value={z} text={DEVELOPMENT_AREA_LABEL[z] ?? z} />
              ))}
            </Select>
            <Select
              id="bc-type"
              labelText="Project type"
              value={buildingType}
              onChange={(e) =>
                setBuildingType(e.target.value as (typeof BuildingType.options)[number])
              }
            >
              {BuildingType.options.map((t) => (
                <SelectItem key={t} value={t} text={BUILDING_TYPE_LABEL[t] ?? t} />
              ))}
            </Select>
            <TextInput
              id="bc-area"
              labelText="Site area (sq m)"
              type="number"
              value={siteArea}
              onChange={(e) => setSiteArea(e.target.value)}
            />
            <TextInput
              id="bc-width"
              labelText="Plot width (m)"
              type="number"
              value={plotWidth}
              onChange={(e) => setPlotWidth(e.target.value)}
            />
            <TextInput
              id="bc-depth"
              labelText="Plot depth (m)"
              type="number"
              value={plotDepth}
              onChange={(e) => setPlotDepth(e.target.value)}
            />
            <TextInput
              id="bc-height"
              labelText="Building height (m)"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
            <TextInput
              id="bc-floors"
              labelText="Floor count"
              type="number"
              value={floorCount}
              onChange={(e) => setFloorCount(e.target.value)}
            />
            {buildingType === "RESIDENTIAL" && (
              <>
                <TextInput
                  id="bc-units"
                  labelText="Dwelling units"
                  type="number"
                  value={dwellingUnits}
                  onChange={(e) => setDwellingUnits(e.target.value)}
                />
                <TextInput
                  id="bc-unit-area"
                  labelText="Typical unit area (sq m)"
                  type="number"
                  value={unitArea}
                  onChange={(e) => setUnitArea(e.target.value)}
                />
              </>
            )}
          </div>

          <TableContainer
            title="Road-abutting sides"
            description="Road class drives centreline margin; distance is from road centre to plot boundary"
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Side</TableHeader>
                  <TableHeader>Abuts road</TableHeader>
                  <TableHeader>Road width (m)</TableHeader>
                  <TableHeader>Road class</TableHeader>
                  <TableHeader>Centre to boundary (m)</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {SIDES.map((name) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      <Checkbox
                        id={`bc-${name}-road`}
                        labelText="Abuts road"
                        hideLabel
                        checked={sides[name]!.abutsRoad}
                        onChange={(_e, { checked }) =>
                          setSide(name, { abutsRoad: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        id={`bc-${name}-w`}
                        labelText="Road width (m)"
                        hideLabel
                        size="sm"
                        type="number"
                        disabled={!sides[name]!.abutsRoad}
                        value={sides[name]!.roadWidthM}
                        onChange={(e) => setSide(name, { roadWidthM: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        id={`bc-${name}-class`}
                        labelText="Road class"
                        hideLabel
                        size="sm"
                        disabled={!sides[name]!.abutsRoad}
                        value={sides[name]!.roadClass}
                        onChange={(e) =>
                          setSide(name, {
                            roadClass: e.target.value as (typeof RoadClass.options)[number],
                          })
                        }
                      >
                        {RoadClass.options.map((c) => (
                          <SelectItem key={c} value={c} text={ROAD_CLASS_LABEL[c] ?? c} />
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextInput
                        id={`bc-${name}-dist`}
                        labelText="Centre to boundary (m)"
                        hideLabel
                        size="sm"
                        type="number"
                        disabled={!sides[name]!.abutsRoad}
                        value={sides[name]!.distanceCentreToBoundaryM}
                        onChange={(e) =>
                          setSide(name, { distanceCentreToBoundaryM: e.target.value })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button disabled={!siteArea || save.isPending} onClick={persist}>
            {save.isPending ? "Saving…" : "Calculate & save"}
          </Button>
        </Stack>
      </Tile>

      {preview && !embedded && (
        <Tile style={{ marginTop: 12 }}>
          <h4>Permissible envelope</h4>
          <div
            style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}
          >
            <Kpi label="FAR allowed" value={preview.farAllowed.toFixed(2)} />
            <Kpi label="Permissible built-up" value={`${preview.permissibleBuiltup} sq m`} />
            <Kpi
              label="Max footprint"
              value={`${preview.coverageAllowed}% / ${preview.maxFootprint} sq m`}
            />
            <Kpi label="Governing road" value={`${preview.governingRoadWidthM} m`} />
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            {(["front", "rear", "left", "right"] as const).map((side) => (
              <Stack key={side} gap={2}>
                <p>{side} setback</p>
                <Stack orientation="horizontal" gap={2}>
                  <strong>{preview.setbacks[side].value} m</strong>
                  <Tag type={preview.setbacks[side].governedBy === "RBL" ? "red" : "blue"} size="sm">
                    {preview.setbacks[side].governedBy}
                  </Tag>
                </Stack>
              </Stack>
            ))}
          </div>
          <p style={{ marginTop: 12 }}>
            <strong>Parking:</strong> {preview.parking.requiredECS} ECS +{" "}
            {preview.parking.visitorECS} visitor = {preview.parking.total} total
          </p>
          <Stack gap={2} style={{ marginTop: 12 }}>
            <p><strong>Secondary compliance flags</strong></p>
            <Stack orientation="horizontal" gap={3}>
              {Object.entries(preview.secondaryCompliance).map(([key, val]) => (
                <Tag key={key} type={val ? "green" : "gray"} size="sm">
                  {key}: {val ? "required" : "n/a"}
                </Tag>
              ))}
            </Stack>
          </Stack>
          {preview.notes.length > 0 && (
            <ul style={{ marginTop: 8 }}>
              {preview.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </Tile>
      )}

      {showFarTable && (
        <Tile style={{ marginTop: 12 }}>
          <BbmpFarRuleTable
            catalog={ruleCatalog}
            zone={developmentArea}
            projectType={buildingType}
            siteAreaSqm={Number(siteArea) || undefined}
            governingRoadWidthM={governingRoadWidthM}
            title="Applicable FAR & ground cover bands"
          />
        </Tile>
      )}
    </>
  );
}

function toSide(s: {
  abutsRoad: boolean;
  roadWidthM: number;
  roadClass?: (typeof RoadClass.options)[number];
  distanceCentreToBoundaryM?: number;
  rblFromCentreM?: number;
}): Side {
  const dist =
    s.distanceCentreToBoundaryM ??
    (s.rblFromCentreM != null && s.rblFromCentreM > 0 ? s.rblFromCentreM : 0);
  return {
    abutsRoad: s.abutsRoad,
    roadWidthM: s.roadWidthM ? String(s.roadWidthM) : "",
    roadClass: s.roadClass ?? "LOCAL",
    distanceCentreToBoundaryM: dist ? String(dist) : "",
  };
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <p>{value}</p>
    </div>
  );
}
