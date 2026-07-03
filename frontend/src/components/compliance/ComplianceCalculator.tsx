import { useState } from "react";
import {
  Button,
  Column,
  Grid,
  InlineNotification,
  NumberInput,
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
  Tile,
} from "@carbon/react";
import { Calculator } from "@carbon/icons-react";
import {
  NBC_ZONES,
  computeNbcPermissible,
  type NbcPermissibleReport,
} from "@esti/contracts";

const EMPTY = { landUseCode: "R-1", siteAreaSqm: 1000, siteWidthM: 25, siteDepthM: 40, frontageM: 25 };

/**
 * NBC permissible-development calculator — a client-only feature module.
 * The engine (computeNbcPermissible) is pure and lives in @esti/contracts;
 * this is just its Carbon presentation. Derives the max development envelope
 * (FAR, coverage, setbacks, height/floors, parking) for a site from its zone.
 */
export function ComplianceCalculator() {
  const [form, setForm] = useState(EMPTY);
  const [report, setReport] = useState<NbcPermissibleReport | null>(null);

  const set = (k: keyof typeof form, v: number | string) => setForm((f) => ({ ...f, [k]: v }));
  const calc = () => setReport(computeNbcPermissible(form));

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <h3>Permissible development calculator</h3>
        <p className="esti-label esti-label--secondary">
          Derives the maximum permissible building envelope for a site from NBC-IND-2016
          development-control limits — FAR, ground coverage, setbacks, height/floors and parking.
          Authority limits are representative defaults; verify against the applicable municipal
          bye-laws before relying on a verdict.
        </p>
      </Stack>

      <Grid narrow>
        <Column sm={4} md={4} lg={6}>
          <Tile>
            <Stack gap={5}>
              <Select id="cc-zone" labelText="Land-use zone" value={form.landUseCode}
                onChange={(e) => set("landUseCode", e.target.value)}>
                {NBC_ZONES.map((z) => (
                  <SelectItem key={z.code} value={z.code} text={`${z.code} · ${z.category} — ${z.subCategory}`} />
                ))}
              </Select>
              <NumberInput id="cc-area" label="Site area (m²)" min={0} step={10}
                value={form.siteAreaSqm} onChange={(_e, { value }) => set("siteAreaSqm", Number(value))} />
              <Stack orientation="horizontal" gap={5}>
                <NumberInput id="cc-width" label="Site width (m)" min={0} step={0.5}
                  value={form.siteWidthM} onChange={(_e, { value }) => set("siteWidthM", Number(value))} />
                <NumberInput id="cc-depth" label="Site depth (m)" min={0} step={0.5}
                  value={form.siteDepthM} onChange={(_e, { value }) => set("siteDepthM", Number(value))} />
              </Stack>
              <NumberInput id="cc-frontage" label="Road frontage (m)" min={0} step={0.5}
                value={form.frontageM} onChange={(_e, { value }) => set("frontageM", Number(value))} />
              <Button renderIcon={Calculator} onClick={calc}>Calculate</Button>
            </Stack>
          </Tile>
        </Column>

        <Column sm={4} md={4} lg={10}>
          {!report && (
            <Tile className="esti-fill">
              <p className="esti-label esti-label--secondary">
                Enter the site parameters and choose a land-use zone, then Calculate.
              </p>
            </Tile>
          )}
          {report && !report.ok && (
            <InlineNotification kind="error" lowContrast hideCloseButton title="Cannot calculate" subtitle={report.error} />
          )}
          {report && report.ok && (
            <Stack gap={5}>
              <Stack orientation="horizontal" gap={3} className="esti-row">
                <Tag type="blue">{report.zoneLabel}</Tag>
                <Tag type="cool-gray" size="sm">{report.siteAreaSqm} m²</Tag>
                <Tag type="outline" size="sm">{report.rulesVersion}</Tag>
              </Stack>

              {Object.entries(report.groups).map(([group, items]) => (
                <TableContainer key={group} title={group}>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Parameter</TableHeader>
                        <TableHeader>Value</TableHeader>
                        <TableHeader>Basis</TableHeader>
                        <TableHeader>Rule</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((i) => (
                        <TableRow key={i.label}>
                          <TableCell>{i.label}</TableCell>
                          <TableCell>
                            <strong>{i.value}</strong> {i.unit}
                          </TableCell>
                          <TableCell>{i.basis}</TableCell>
                          <TableCell><Tag type="gray" size="sm">{i.ruleRef}</Tag></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ))}

              {report.notes.map((n, idx) => (
                <InlineNotification key={idx} kind="info" lowContrast hideCloseButton title="Note" subtitle={n} />
              ))}
            </Stack>
          )}
        </Column>
      </Grid>
    </Stack>
  );
}
