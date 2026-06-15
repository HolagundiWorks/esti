import {
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import {
  DEVELOPMENT_AREA_LABEL,
  DevelopmentArea,
  type BbmpProjectType,
  type FarRuleRow,
  farForProjectType,
  farRuleRowKey,
  formatRoadBandM,
  formatSqmBand,
  lookupFarRuleResult,
  type BbmpRuleCatalog,
  DEFAULT_BBMP_RULE_CATALOG,
} from "@esti/contracts";
import { useMemo, useState } from "react";

type FarRuleTableRow = FarRuleRow & { key: string };

function toTableRows(far: FarRuleRow[]): FarRuleTableRow[] {
  return far.map((row) => ({ ...row, key: farRuleRowKey(row) }));
}

function farCell(row: FarRuleRow, projectType: BbmpProjectType): string {
  return farForProjectType(row, projectType).toFixed(2);
}

export function BbmpFarRuleTable({
  catalog = DEFAULT_BBMP_RULE_CATALOG,
  zone: zoneProp,
  projectType = "RESIDENTIAL",
  siteAreaSqm,
  governingRoadWidthM,
  title = "FAR & ground cover rule table",
  description = "Permissible FAR and plot coverage by development zone, site area band, and governing road width. When site area falls in a higher band but the governing road is narrower, the lesser road-width band applies.",
}: {
  catalog?: BbmpRuleCatalog;
  zone?: (typeof DevelopmentArea.options)[number];
  projectType?: BbmpProjectType;
  siteAreaSqm?: number;
  governingRoadWidthM?: number;
  title?: string;
  description?: string;
}) {
  const [zone, setZone] = useState<(typeof DevelopmentArea.options)[number]>(
    zoneProp ?? "A",
  );

  const activeZone = zoneProp ?? zone;

  const rows = useMemo(
    () => catalog.far.filter((r) => r.developmentArea === activeZone),
    [catalog.far, activeZone],
  );

  const applicableKey = useMemo(() => {
    if (siteAreaSqm == null || siteAreaSqm <= 0) return null;
    const road = governingRoadWidthM ?? 0;
    const lookup = lookupFarRuleResult(activeZone, siteAreaSqm, road, catalog);
    return farRuleRowKey(lookup.row);
  }, [activeZone, siteAreaSqm, governingRoadWidthM, catalog]);

  const appliedLookup = useMemo(() => {
    if (siteAreaSqm == null || siteAreaSqm <= 0) return null;
    return lookupFarRuleResult(
      activeZone,
      siteAreaSqm,
      governingRoadWidthM ?? 0,
      catalog,
    );
  }, [activeZone, siteAreaSqm, governingRoadWidthM, catalog]);

  return (
    <TableContainer title={title} description={description}>
      {!zoneProp && (
        <div style={{ marginBottom: 12, maxWidth: 320 }}>
          <Select
            id="bbmp-far-zone"
            labelText="Development zone"
            value={zone}
            onChange={(e) =>
              setZone(e.target.value as (typeof DevelopmentArea.options)[number])
            }
          >
            {DevelopmentArea.options.map((z) => (
              <SelectItem key={z} value={z} text={DEVELOPMENT_AREA_LABEL[z] ?? z} />
            ))}
          </Select>
        </div>
      )}
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Zone</TableHeader>
            <TableHeader>Site area (sq m)</TableHeader>
            <TableHeader>Governing road width</TableHeader>
            <TableHeader>Residential FAR</TableHeader>
            <TableHeader>Commercial FAR</TableHeader>
            <TableHeader>Ground cover %</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {toTableRows(rows).map((row) => {
            const applies = applicableKey === row.key;
            return (
              <TableRow
                key={row.key}
                style={
                  applies ? { outline: "2px solid var(--cds-border-interactive)" } : undefined
                }
              >
                <TableCell>{row.developmentArea}</TableCell>
                <TableCell>{formatSqmBand(row.siteAreaMin, row.siteAreaMax)}</TableCell>
                <TableCell>{formatRoadBandM(row.roadWidthMin, row.roadWidthMax)}</TableCell>
                <TableCell>{row.residentialFar.toFixed(2)}</TableCell>
                <TableCell>{row.commercialFar.toFixed(2)}</TableCell>
                <TableCell>{row.maxCoverage}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {appliedLookup && siteAreaSqm != null && (
        <p style={{ marginTop: 12 }}>
          <Tag type="blue" size="sm">Applied row</Tag>{" "}
          FAR {farCell(appliedLookup.row, projectType)}, ground cover{" "}
          {appliedLookup.row.maxCoverage}% for {siteAreaSqm} sq m site, governing road{" "}
          {governingRoadWidthM ?? 0} m
          {appliedLookup.basis === "road"
            ? " — limited by road width (not site area alone)"
            : ""}
        </p>
      )}
    </TableContainer>
  );
}
