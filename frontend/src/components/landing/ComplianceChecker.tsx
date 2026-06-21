import {
  Button,
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Link,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { useEffect, useState, type FormEvent } from "react";

type BuildingType = "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
type DevArea = "A" | "B" | "C" | "D";

interface CheckInput {
  buildingType: BuildingType;
  developmentArea: DevArea;
  siteAreaSqm: number;
  proposedHeightM: number;
  floorCount: number;
  frontRoadWidthM: number;
}

interface Setback {
  value: number;
  governedBy: string;
}

interface ComplianceResult {
  farAllowed: number;
  coverageAllowed: number;
  permissibleBuiltup: number;
  maxFootprint: number;
  setbacks: { front: Setback; rear: Setback; left: Setback; right: Setback };
  parking: { total: number; requiredECS: number; visitorECS: number };
  basementAllowed: boolean;
}

interface ApiResponse {
  apiVersion: string;
  authority: string;
  ruleSet: { id: string | null; label: string };
  result: ComplianceResult;
}

// Reference data types from /api/compliance/cities/:cityId
interface SetbackRef { front: string; rear: string; side: string; }
interface ZoneUsage {
  type: string;
  condition: string;
  farMin: number;
  farMax: number;
  coverageMax: number;
  setbacks: SetbackRef;
  parking?: string;
}
interface CityRegs {
  id: string;
  city: string;
  state: string;
  authority: string;
  regulation: string;
  year: number;
  status: "computed" | "reference";
  zones: ZoneUsage[];
  notes: string[];
  source: string;
}

interface CityOption { id: string; city: string; state: string; status: "computed" | "reference"; }

const BUILDING_TYPES: { value: BuildingType; label: string }[] = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "SEMI_PUBLIC", label: "Semi-Public / Institutional" },
  { value: "PUBLIC", label: "Public / Government" },
];

const DEV_AREAS: { value: DevArea; label: string }[] = [
  { value: "A", label: "Zone A — Core / Urban" },
  { value: "B", label: "Zone B — Inner Ring" },
  { value: "C", label: "Zone C — Outer Ring" },
  { value: "D", label: "Zone D — Peripheral" },
];

const USE_TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  MIXED: "Mixed use",
  INDUSTRIAL: "Industrial",
};

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
      <span className="esti-label esti-label--secondary">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CityReferenceTable({ data }: { data: CityRegs }) {
  return (
    <Stack gap={5}>
      <div>
        <p className="esti-label esti-label--secondary" style={{ margin: "0 0 0.25rem" }}>
          {data.authority}
        </p>
        <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
          {data.regulation} · {data.year}
        </p>
      </div>

      {data.zones.map((zone, i) => (
        <Tile key={i}>
          <Stack gap={3}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <Tag type="blue" size="sm">{USE_TYPE_LABELS[zone.type] ?? zone.type}</Tag>
              <span className="esti-label esti-label--secondary">{zone.condition}</span>
            </div>
            <div style={{ borderBottom: "1px solid var(--cds-border-subtle)" }} />
            <ResultRow label="FAR / FSI" value={zone.farMin === zone.farMax ? `${zone.farMin}` : `${zone.farMin} – ${zone.farMax}`} />
            <ResultRow label="Ground coverage" value={`≤ ${zone.coverageMax}%`} />
            <ResultRow label="Front setback" value={zone.setbacks.front} />
            <ResultRow label="Rear setback" value={zone.setbacks.rear} />
            <ResultRow label="Side setback" value={zone.setbacks.side} />
            {zone.parking && <ResultRow label="Parking" value={zone.parking} />}
          </Stack>
        </Tile>
      ))}

      {data.notes.length > 0 && (
        <Tile>
          <Stack gap={2}>
            <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>Notes</p>
            <div style={{ borderBottom: "1px solid var(--cds-border-subtle)" }} />
            {data.notes.map((note, i) => (
              <p key={i} className="esti-label esti-label--helper" style={{ margin: 0 }}>
                · {note}
              </p>
            ))}
          </Stack>
        </Tile>
      )}

      <p className="esti-label esti-label--helper">
        Source: {data.source}
      </p>
    </Stack>
  );
}

export function ComplianceChecker({ apiBase = "" }: { apiBase?: string }) {
  // City list state
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState("bbmp-bengaluru");
  const [cityData, setCityData] = useState<CityRegs | null>(null);
  const [cityLoading, setCityLoading] = useState(false);

  // BBMP compute form state
  const [form, setForm] = useState<CheckInput>({
    buildingType: "RESIDENTIAL",
    developmentArea: "A",
    siteAreaSqm: 200,
    proposedHeightM: 9,
    floorCount: 2,
    frontRoadWidthM: 9,
  });
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load city list on mount
  useEffect(() => {
    fetch(`${apiBase}/api/compliance/cities`)
      .then((r) => r.json())
      .then((d: { cities: CityOption[] }) => setCities(d.cities))
      .catch(() => {/* non-fatal */});
  }, [apiBase]);

  // Load reference data when a non-BBMP city is selected
  useEffect(() => {
    if (selectedCity === "bbmp-bengaluru") {
      setCityData(null);
      return;
    }
    setCityLoading(true);
    fetch(`${apiBase}/api/compliance/cities/${selectedCity}`)
      .then((r) => r.json())
      .then((d: { data: CityRegs }) => setCityData(d.data))
      .catch(() => setCityData(null))
      .finally(() => setCityLoading(false));
  }, [selectedCity, apiBase]);

  async function check(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/api/compliance/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          buildingType: form.buildingType,
          developmentArea: form.developmentArea,
          siteAreaSqm: form.siteAreaSqm,
          proposedHeightM: form.proposedHeightM,
          floorCount: form.floorCount,
          front: { abutsRoad: form.frontRoadWidthM > 0, roadWidthM: form.frontRoadWidthM },
          rear: {},
          left: {},
          right: {},
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const r = result?.result;
  const isBbmp = selectedCity === "bbmp-bengaluru";

  return (
    <Stack gap={6}>
      {/* City selector */}
      <Select
        id="cc-city"
        labelText="City / jurisdiction"
        value={selectedCity}
        onChange={(e) => {
          setSelectedCity(e.target.value);
          setResult(null);
          setError(null);
        }}
      >
        {cities.length > 0
          ? cities.map((c) => (
              <SelectItem
                key={c.id}
                value={c.id}
                text={`${c.city}, ${c.state}${c.status === "computed" ? " — Full compute" : " — DCR reference"}`}
              />
            ))
          : [
              <SelectItem key="bbmp" value="bbmp-bengaluru" text="Bengaluru, Karnataka — Full compute" />,
            ]}
      </Select>

      {/* BBMP full compute */}
      {isBbmp && (
        <Grid narrow>
          <Column sm={4} md={4} lg={8}>
            <form onSubmit={check}>
              <Stack gap={5}>
                <Select
                  id="cc-type"
                  labelText="Building type"
                  value={form.buildingType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, buildingType: e.target.value as BuildingType }))
                  }
                >
                  {BUILDING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} text={t.label} />
                  ))}
                </Select>

                <Select
                  id="cc-area"
                  labelText="Development zone"
                  value={form.developmentArea}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, developmentArea: e.target.value as DevArea }))
                  }
                >
                  {DEV_AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value} text={a.label} />
                  ))}
                </Select>

                <NumberInput
                  id="cc-site"
                  label="Site area (m²)"
                  min={30}
                  max={100000}
                  value={form.siteAreaSqm}
                  onChange={(_e, { value }) =>
                    setForm((f) => ({ ...f, siteAreaSqm: Number(value) || f.siteAreaSqm }))
                  }
                />

                <NumberInput
                  id="cc-height"
                  label="Proposed height (m)"
                  min={3}
                  max={120}
                  step={0.5}
                  value={form.proposedHeightM}
                  onChange={(_e, { value }) =>
                    setForm((f) => ({ ...f, proposedHeightM: Number(value) || f.proposedHeightM }))
                  }
                />

                <NumberInput
                  id="cc-floors"
                  label="Number of floors"
                  min={1}
                  max={40}
                  value={form.floorCount}
                  onChange={(_e, { value }) =>
                    setForm((f) => ({ ...f, floorCount: Number(value) || f.floorCount }))
                  }
                />

                <NumberInput
                  id="cc-road"
                  label="Front road width (m)"
                  min={0}
                  max={60}
                  step={0.5}
                  value={form.frontRoadWidthM}
                  onChange={(_e, { value }) =>
                    setForm((f) => ({ ...f, frontRoadWidthM: Number(value) }))
                  }
                  helperText="Width of road abutting front of plot"
                />

                <Button type="submit" disabled={loading}>
                  {loading ? <InlineLoading description="Checking…" /> : "Check compliance"}
                </Button>

                {error && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title="Error"
                    subtitle={error}
                    hideCloseButton
                  />
                )}
              </Stack>
            </form>
          </Column>

          <Column sm={4} md={4} lg={8}>
            {r ? (
              <Stack gap={5}>
                <Tile>
                  <Stack gap={4}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <Tag type="blue" size="sm">BBMP 2003</Tag>
                      <Tag type="green" size="sm">{result!.ruleSet.label}</Tag>
                    </div>
                    <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
                      Pre-construction development envelope
                    </p>
                    <div style={{ borderBottom: "1px solid var(--cds-border-subtle)" }} />
                    <ResultRow label="Permissible built-up" value={`${r.permissibleBuiltup.toFixed(1)} m²`} />
                    <ResultRow label="FAR allowed" value={r.farAllowed.toFixed(2)} />
                    <ResultRow label="Ground coverage" value={`${r.coverageAllowed.toFixed(0)}%`} />
                    <ResultRow label="Max footprint" value={`${r.maxFootprint.toFixed(1)} m²`} />
                  </Stack>
                </Tile>

                <Tile>
                  <Stack gap={4}>
                    <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>Setbacks (m)</p>
                    <div style={{ borderBottom: "1px solid var(--cds-border-subtle)" }} />
                    <ResultRow label="Front" value={`${r.setbacks.front.value} m`} />
                    <ResultRow label="Rear" value={`${r.setbacks.rear.value} m`} />
                    <ResultRow label="Left" value={`${r.setbacks.left.value} m`} />
                    <ResultRow label="Right" value={`${r.setbacks.right.value} m`} />
                  </Stack>
                </Tile>

                <Tile>
                  <Stack gap={4}>
                    <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>Parking & basement</p>
                    <div style={{ borderBottom: "1px solid var(--cds-border-subtle)" }} />
                    <ResultRow label="Required parking" value={`${r.parking.total} ECS`} />
                    <ResultRow label="Visitor parking" value={`${r.parking.visitorECS} ECS`} />
                    <ResultRow label="Basement permitted" value={r.basementAllowed ? "Yes" : "No"} />
                  </Stack>
                </Tile>
              </Stack>
            ) : (
              <Tile>
                <p className="esti-label esti-label--secondary">
                  Fill in the site parameters and click "Check compliance" to see the BBMP
                  development envelope — FAR, setbacks, coverage, parking, and basement rules.
                </p>
              </Tile>
            )}
          </Column>
        </Grid>
      )}

      {/* Other cities — reference table */}
      {!isBbmp && (
        <div>
          {cityLoading && <InlineLoading description="Loading DCR reference data…" />}
          {!cityLoading && cityData && <CityReferenceTable data={cityData} />}
          {!cityLoading && !cityData && (
            <Tile>
              <p className="esti-label esti-label--secondary">
                DCR reference data unavailable.{" "}
                <Link href="/api/compliance/cities" target="_blank">
                  Browse via API
                </Link>
              </p>
            </Tile>
          )}
        </div>
      )}
    </Stack>
  );
}
