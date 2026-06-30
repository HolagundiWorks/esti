import {
  Column,
  Grid,
  ProgressBar,
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
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

export function ProjectCostIntelligence({ projectId }: { projectId: string }) {
  const dashQ = trpc.cms.intelligence.costDashboard.useQuery({ projectId });
  const matQ = trpc.cms.intelligence.materialForecast.useQuery({ projectId });

  const d = dashQ.data;
  const materials = (matQ.data ?? []).filter((l) => l.type === "MATERIAL");
  const labour = (matQ.data ?? []).filter((l) => l.type === "LABOUR");

  return (
    <Stack gap={7}>
      <h3>Cost Intelligence</h3>

      {/* CMS-8: Cost Dashboard */}
      <Stack gap={4}>
        <h4>Cost Dashboard</h4>
        <DataState
          loading={dashQ.isLoading}
          isEmpty={!dashQ.isLoading && !d}
          empty={{ title: "No cost data", description: "Add elements in the Estimate tab to see cost intelligence." }}
          columnCount={4}
        >
          {d && (
            <Grid>
              <Column sm={4} md={4} lg={4}>
                <Tile>
                  <p className="esti-label--secondary">Estimated Total</p>
                  <p>{formatINR(d.estimatedTotalPaise)}</p>
                  <p className="esti-label--helper">{d.elementCount} elements</p>
                </Tile>
              </Column>
              <Column sm={4} md={4} lg={4}>
                <Tile>
                  <p className="esti-label--secondary">Executed (Est. Value)</p>
                  <p>{formatINR(d.executedEstimatedPaise)}</p>
                  <ProgressBar
                    label=" "
                    value={d.percentExecuted}
                    max={100}
                    size="small"
                    hideLabel
                  />
                  <p className="esti-label--helper">{d.percentExecuted}% complete</p>
                </Tile>
              </Column>
              <Column sm={4} md={4} lg={4}>
                <Tile>
                  <p className="esti-label--secondary">Certified Total</p>
                  <p>{formatINR(d.certifiedTotalPaise)}</p>
                  <ProgressBar
                    label=" "
                    value={d.percentCertified}
                    max={100}
                    size="small"
                    hideLabel
                  />
                  <p className="esti-label--helper">{d.percentCertified}% of estimated</p>
                </Tile>
              </Column>
              <Column sm={4} md={4} lg={4}>
                <Tile>
                  <p className="esti-label--secondary">Balance to Certify</p>
                  <p>
                    {formatINR(Math.max(0, d.estimatedTotalPaise - d.certifiedTotalPaise))}
                  </p>
                  <div className="esti-label--helper">
                    {d.certifiedTotalPaise >= d.estimatedTotalPaise ? (
                      <Tag type="green" size="sm">Fully certified</Tag>
                    ) : (
                      <Tag type="cool-gray" size="sm">Pending</Tag>
                    )}
                  </div>
                </Tile>
              </Column>
            </Grid>
          )}
        </DataState>
      </Stack>

      {/* CMS-7: Material Intelligence */}
      {materials.length > 0 && (
        <Stack gap={4}>
          <h4>Material Forecast</h4>
          <TableContainer title="Materials required (from element qty × spec recipe)">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Material</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Forecast qty</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.itemId ?? m.itemName}>
                    <TableCell>{m.itemName}</TableCell>
                    <TableCell>{m.unit ?? "—"}</TableCell>
                    <TableCell>{m.forecastQty.toFixed(3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {labour.length > 0 && (
        <Stack gap={4}>
          <h4>Labour Forecast</h4>
          <TableContainer title="Labour required (from element qty × spec recipe)">
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Labour resource</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Forecast qty</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {labour.map((l) => (
                  <TableRow key={l.itemId ?? l.itemName}>
                    <TableCell>{l.itemName}</TableCell>
                    <TableCell>{l.unit ?? "—"}</TableCell>
                    <TableCell>{l.forecastQty.toFixed(3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {!dashQ.isLoading && !matQ.isLoading && matQ.data?.length === 0 && !dashQ.data && (
        <p className="esti-label--secondary">
          Link elements to KB specifications with recipes to generate material and labour forecasts.
        </p>
      )}
    </Stack>
  );
}
