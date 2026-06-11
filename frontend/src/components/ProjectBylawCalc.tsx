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
  TextInput,
  Tile,
} from "@carbon/react";
import {
  BUILDING_TYPE_LABEL,
  BuildingType,
  type BylawCalcInput,
  type BylawEnvelope,
  computeBylawEnvelope,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";

type Side = { abutsRoad: boolean; roadWidthM: string; rblFromCentreM: string };
const emptySide = (): Side => ({
  abutsRoad: false,
  roadWidthM: "",
  rblFromCentreM: "",
});
const SIDES = ["front", "rear", "left", "right"] as const;

export function ProjectBylawCalc({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );
  const savedQ = trpc.bylawCalc.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const [buildingType, setBuildingType] =
    useState<(typeof BuildingType.options)[number]>("RESIDENTIAL");
  const [siteArea, setSiteArea] = useState("");
  const [height, setHeight] = useState("11.5");
  const [sides, setSides] = useState<Record<string, Side>>({
    front: emptySide(),
    rear: emptySide(),
    left: emptySide(),
    right: emptySide(),
  });
  const [preview, setPreview] = useState<BylawEnvelope | null>(null);

  // Prefill from a saved calc, else from the project's site area.
  useEffect(() => {
    const saved = savedQ.data?.input as BylawCalcInput | undefined;
    if (saved) {
      setBuildingType(saved.buildingType);
      setSiteArea(String(saved.siteAreaSqm));
      setHeight(String(saved.proposedHeightM));
      setSides({
        front: toSide(saved.front),
        rear: toSide(saved.rear),
        left: toSide(saved.left),
        right: toSide(saved.right),
      });
      setPreview((savedQ.data?.result as BylawEnvelope) ?? null);
    } else if (projectQ.data?.siteAreaSqm) {
      setSiteArea(String(projectQ.data.siteAreaSqm));
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
      rblFromCentreM: Number(s.rblFromCentreM) || 0,
    });
    return {
      buildingType,
      siteAreaSqm: area,
      proposedHeightM: Number(height) || 11.5,
      front: side(sides.front!),
      rear: side(sides.rear!),
      left: side(sides.left!),
      right: side(sides.right!),
    };
  }

  // Live preview without persisting.
  useEffect(() => {
    const input = buildInput();
    setPreview(input ? computeBylawEnvelope(input) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingType, siteArea, height, sides]);

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
      <h3>Development controls calculator</h3>
      <Tile style={{ marginTop: 8 }}>
        <Stack gap={5}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Select
              id="bc-type"
              labelText="Project type"
              value={buildingType}
              onChange={(e) =>
                setBuildingType(
                  e.target.value as (typeof BuildingType.options)[number],
                )
              }
            >
              {BuildingType.options.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  text={BUILDING_TYPE_LABEL[t] ?? t}
                />
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
              id="bc-height"
              labelText="Proposed height (m)"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>

          <TableContainer
            title="Sides"
            description="Mark road-abutting sides; enter road width and RBL from road centre"
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Side</TableHeader>
                  <TableHeader>Abuts road</TableHeader>
                  <TableHeader>Road width (m)</TableHeader>
                  <TableHeader>RBL from centre (m)</TableHeader>
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
                        onChange={(e) =>
                          setSide(name, { roadWidthM: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextInput
                        id={`bc-${name}-rbl`}
                        labelText="RBL from centre (m)"
                        hideLabel
                        size="sm"
                        type="number"
                        disabled={!sides[name]!.abutsRoad}
                        value={sides[name]!.rblFromCentreM}
                        onChange={(e) =>
                          setSide(name, { rblFromCentreM: e.target.value })
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

      {preview && (
        <Tile style={{ marginTop: 12 }}>
          <h4>Permissible envelope</h4>
          <div
            style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}
          >
            <Kpi label="FAR" value={preview.far.toFixed(2)} />
            <Kpi label="FAR area" value={`${preview.maxBuiltUpSqm} sq m`} />
            <Kpi
              label="Ground coverage"
              value={`${preview.coveragePct}% / ${preview.maxFootprintSqm} sq m`}
            />
            <Kpi
              label="Governing road"
              value={`${preview.governingRoadWidthM} m`}
            />
          </div>
          <p>
            <strong>Restricted building lines:</strong> applied per
            road-abutting side when the RBL exceeds the tabular setback.
          </p>
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <Kpi label="Setback front" value={`${preview.setbacks.front} m`} />
            <Kpi label="Setback rear" value={`${preview.setbacks.rear} m`} />
            <Kpi label="Setback left" value={`${preview.setbacks.left} m`} />
            <Kpi label="Setback right" value={`${preview.setbacks.right} m`} />
          </div>
          <p style={{ marginTop: 12 }}>
            <strong>Parking:</strong> {preview.parking}
          </p>
          {preview.notes.length > 0 && (
            <ul style={{ marginTop: 8 }}>
              {preview.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: 8 }}>
            Current calculation uses the BBMP seed rule set. It is not valid for
            another district or authority until a matching versioned rule set is
            selected.
          </p>
        </Tile>
      )}
    </>
  );
}

function toSide(s: {
  abutsRoad: boolean;
  roadWidthM: number;
  rblFromCentreM: number;
}): Side {
  return {
    abutsRoad: s.abutsRoad,
    roadWidthM: s.roadWidthM ? String(s.roadWidthM) : "",
    rblFromCentreM: s.rblFromCentreM ? String(s.rblFromCentreM) : "",
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
