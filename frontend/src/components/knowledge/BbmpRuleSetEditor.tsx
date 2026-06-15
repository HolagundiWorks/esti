import {
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  Select,
  SelectItem,
} from "@carbon/react";
import {
  BBMP_PROJECT_TYPE_LABEL,
  DEFAULT_BBMP_RULE_CATALOG,
  DEVELOPMENT_AREA_LABEL,
  DevelopmentArea,
  ROAD_CLASS_LABEL,
  type BbmpRuleCatalogInput,
} from "@esti/contracts";

const OPEN_BAND = 999_999_999;

function capBand(value: number): number {
  return !Number.isFinite(value) || value >= OPEN_BAND ? OPEN_BAND : value;
}

/** Clone default BBMP tables for the create-rule-set form. */
export function defaultBbmpCatalogInput(): BbmpRuleCatalogInput {
  const c = DEFAULT_BBMP_RULE_CATALOG;
  return {
    far: c.far.map((r) => ({
      ...r,
      siteAreaMax: capBand(r.siteAreaMax),
      roadWidthMax: capBand(r.roadWidthMax),
    })),
    lowriseSetbacks: c.lowriseSetbacks.map((r) => ({
      ...r,
      depthMax: capBand(r.depthMax),
      widthMax: capBand(r.widthMax),
    })),
    highriseSetbacks: c.highriseSetbacks.map((r) => ({
      ...r,
      heightMax: capBand(r.heightMax),
    })),
    roadMargins: [...c.roadMargins],
    parkingRules: c.parkingRules.map((r) => ({
      ...r,
      unitAreaMax: capBand(r.unitAreaMax),
      floorAreaMax: capBand(r.floorAreaMax),
    })),
    secondaryRules: c.secondaryRules.map((r) => ({
      ruleKey: r.ruleKey,
      description: r.description,
      siteAreaMin: r.siteAreaMin,
      plinthAreaMin: r.plinthAreaMin,
      heightMinM: r.heightMinM,
      floorsMin: r.floorsMin,
      requirementJson: { ...r.requirementJson },
    })),
    engineConstants: { ...c.engineConstants },
  };
}

function numInput(
  value: number,
  onChange: (n: number) => void,
  label: string,
  id: string,
) {
  return (
    <TextInput
      id={id}
      labelText={label}
      hideLabel
      size="sm"
      type="number"
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

type Props = {
  catalog: BbmpRuleCatalogInput;
  onChange: (catalog: BbmpRuleCatalogInput) => void;
};

export function BbmpRuleSetEditor({ catalog, onChange }: Props) {
  const setFar = (index: number, patch: Partial<BbmpRuleCatalogInput["far"][number]>) => {
    onChange({
      ...catalog,
      far: catalog.far.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const setLowrise = (
    index: number,
    patch: Partial<BbmpRuleCatalogInput["lowriseSetbacks"][number]>,
  ) => {
    onChange({
      ...catalog,
      lowriseSetbacks: catalog.lowriseSetbacks.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  const setHighrise = (
    index: number,
    patch: Partial<BbmpRuleCatalogInput["highriseSetbacks"][number]>,
  ) => {
    onChange({
      ...catalog,
      highriseSetbacks: catalog.highriseSetbacks.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  const setRoad = (index: number, patch: Partial<BbmpRuleCatalogInput["roadMargins"][number]>) => {
    onChange({
      ...catalog,
      roadMargins: catalog.roadMargins.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  const setParking = (
    index: number,
    patch: Partial<BbmpRuleCatalogInput["parkingRules"][number]>,
  ) => {
    onChange({
      ...catalog,
      parkingRules: catalog.parkingRules.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  const setEngine = (key: keyof BbmpRuleCatalogInput["engineConstants"], value: number) => {
    onChange({
      ...catalog,
      engineConstants: { ...catalog.engineConstants, [key]: value },
    });
  };

  return (
    <Tabs>
      <TabList aria-label="BBMP rule tables" contained>
        <Tab>FAR &amp; coverage</Tab>
        <Tab>Setbacks (low-rise)</Tab>
        <Tab>Setbacks (high-rise)</Tab>
        <Tab>Road margins</Tab>
        <Tab>Parking</Tab>
        <Tab>Engine constants</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <TableContainer
            title="FAR rule table"
            description="Zone, site area band, road width band, FAR by use, ground cover %"
          >
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Zone</TableHeader>
                  <TableHeader>Site min</TableHeader>
                  <TableHeader>Site max</TableHeader>
                  <TableHeader>Road min</TableHeader>
                  <TableHeader>Road max</TableHeader>
                  <TableHeader>Res FAR</TableHeader>
                  <TableHeader>Com FAR</TableHeader>
                  <TableHeader>Cover %</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalog.far.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select
                        id={`far-zone-${i}`}
                        labelText="Zone"
                        hideLabel
                        size="sm"
                        value={row.developmentArea}
                        onChange={(e) =>
                          setFar(i, { developmentArea: e.target.value as DevelopmentArea })
                        }
                      >
                        {DevelopmentArea.options.map((z) => (
                          <SelectItem key={z} value={z} text={DEVELOPMENT_AREA_LABEL[z]} />
                        ))}
                      </Select>
                    </TableCell>
                    {(
                      [
                        ["siteAreaMin", row.siteAreaMin],
                        ["siteAreaMax", row.siteAreaMax],
                        ["roadWidthMin", row.roadWidthMin],
                        ["roadWidthMax", row.roadWidthMax],
                        ["residentialFar", row.residentialFar],
                        ["commercialFar", row.commercialFar],
                        ["maxCoverage", row.maxCoverage],
                      ] as const
                    ).map(([key, val]) => (
                      <TableCell key={key}>
                        {numInput(val, (n) => setFar(i, { [key]: n }), key, `far-${i}-${key}`)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel>
          <TableContainer title="Table 4 — low-rise setbacks (m)">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Depth min</TableHeader>
                  <TableHeader>Depth max</TableHeader>
                  <TableHeader>Width min</TableHeader>
                  <TableHeader>Width max</TableHeader>
                  <TableHeader>Front</TableHeader>
                  <TableHeader>Rear</TableHeader>
                  <TableHeader>Left</TableHeader>
                  <TableHeader>Right</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalog.lowriseSetbacks.map((row, i) => (
                  <TableRow key={i}>
                    {(
                      [
                        "depthMin",
                        "depthMax",
                        "widthMin",
                        "widthMax",
                        "front",
                        "rear",
                        "left",
                        "right",
                      ] as const
                    ).map((key) => (
                      <TableCell key={key}>
                        {numInput(row[key], (n) => setLowrise(i, { [key]: n }), key, `lr-${i}-${key}`)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel>
          <TableContainer title="Table 5 — high-rise uniform setbacks (m)">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Height min</TableHeader>
                  <TableHeader>Height max</TableHeader>
                  <TableHeader>Uniform setback</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalog.highriseSetbacks.map((row, i) => (
                  <TableRow key={i}>
                    {(["heightMin", "heightMax", "uniformSetback"] as const).map((key) => (
                      <TableCell key={key}>
                        {numInput(row[key], (n) => setHighrise(i, { [key]: n }), key, `hr-${i}-${key}`)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel>
          <TableContainer title="Road centreline margins (m)">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Road class</TableHeader>
                  <TableHeader>Margin (m)</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalog.roadMargins.map((row, i) => (
                  <TableRow key={row.roadClass}>
                    <TableCell>{ROAD_CLASS_LABEL[row.roadClass]}</TableCell>
                    <TableCell>
                      {numInput(
                        row.roadMarginM,
                        (n) => setRoad(i, { roadMarginM: n }),
                        "margin",
                        `road-${i}`,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel>
          <TableContainer title="Parking rules">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Use</TableHeader>
                  <TableHeader>Unit min</TableHeader>
                  <TableHeader>Unit max</TableHeader>
                  <TableHeader>Formula</TableHeader>
                  <TableHeader>Sqm/ECS</TableHeader>
                  <TableHeader>Visitor %</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalog.parkingRules.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{BBMP_PROJECT_TYPE_LABEL[row.projectType]}</TableCell>
                    <TableCell>
                      {numInput(row.unitAreaMin, (n) => setParking(i, { unitAreaMin: n }), "uMin", `pk-${i}-u0`)}
                    </TableCell>
                    <TableCell>
                      {numInput(row.unitAreaMax, (n) => setParking(i, { unitAreaMax: n }), "uMax", `pk-${i}-u1`)}
                    </TableCell>
                    <TableCell>{row.formulaKey}</TableCell>
                    <TableCell>
                      {numInput(
                        row.sqmPerEcs ?? 50,
                        (n) => setParking(i, { sqmPerEcs: n }),
                        "sqm",
                        `pk-${i}-sqm`,
                      )}
                    </TableCell>
                    <TableCell>
                      {numInput(
                        row.visitorParkingPct,
                        (n) => setParking(i, { visitorParkingPct: n }),
                        "vis",
                        `pk-${i}-vis`,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel>
          <Stack gap={4}>
            <p>Thresholds used by the shared compliance engine.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {(
                [
                  ["lowriseHeightM", "Low-rise height cutoff (m)"],
                  ["basementMinHeightM", "Basement min height (m)"],
                  ["basementMaxHeightM", "Basement max height (m)"],
                  ["basementMechParkingHeightM", "Mech parking basement max (m)"],
                  ["basementMaxProjectionM", "Basement max projection (m)"],
                  ["visitorParkingPct", "Visitor parking ratio"],
                  ["sqmPerEcs", "Sq m per ECS"],
                ] as const
              ).map(([key, label]) => (
                <TextInput
                  key={key}
                  id={`eng-${key}`}
                  labelText={label}
                  type="number"
                  value={String(catalog.engineConstants[key])}
                  onChange={(e) => setEngine(key, Number(e.target.value) || 0)}
                  style={{ minWidth: 220 }}
                />
              ))}
            </div>
          </Stack>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
