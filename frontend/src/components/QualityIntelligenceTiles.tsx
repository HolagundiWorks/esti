/**
 * Quality intelligence tiles — shared by Dashboard and marketing landing preview.
 * Studio quality radar + revision detail (with proportional meter) + technical metrics.
 */
import { MeterChart, RadarChart } from "@carbon/charts-react";
import { InlineLoading, Stack, Tag, Tile } from "@carbon/react";
import {
  buildRadarChartData,
  buildRevisionSourceMeterData,
  computeStudioQualityAxes,
  studioQualityAverage,
  type RevisionIntelligenceSnapshot,
  type TechnicalIntelligenceSnapshot,
} from "../lib/quality-intelligence.js";

export type { RevisionIntelligenceSnapshot, TechnicalIntelligenceSnapshot };

export type QiCardHealth = "alert" | "watch" | "ok" | "neutral";

const RISK_TAG: Record<RevisionIntelligenceSnapshot["revisionRiskBand"], "red" | "magenta" | "green"> = {
  HIGH: "red",
  MEDIUM: "magenta",
  LOW: "green",
};

const EDGE_COLOR: Record<QiCardHealth, string> = {
  alert: "var(--cds-support-error)",
  watch: "var(--cds-support-warning)",
  ok: "var(--cds-support-success)",
  neutral: "var(--cds-border-subtle-01)",
};

const QI_RADAR_HEIGHT = "220px";
const QI_METER_HEIGHT = "130px";

export function qiEdge(health: QiCardHealth) {
  return { borderLeft: `3px solid ${EDGE_COLOR[health]}` };
}

export function revisionHealth(
  data: RevisionIntelligenceSnapshot | null | undefined,
): QiCardHealth {
  if (!data || data.totalDecisions === 0) return "neutral";
  if (data.revisionRiskBand === "HIGH") return "alert";
  if (data.revisionRiskBand === "MEDIUM") return "watch";
  return "ok";
}

export function technicalHealth(
  data: TechnicalIntelligenceSnapshot | null | undefined,
): QiCardHealth {
  if (!data) return "neutral";
  if (data.drawingAccuracyPct < 75 || data.siteQueryRate > 25) return "alert";
  if (data.drawingAccuracyPct < 90 || data.siteQueryRate > 10) return "watch";
  return "ok";
}

export function studioProfileHealth(
  revision: RevisionIntelligenceSnapshot | null | undefined,
  technical: TechnicalIntelligenceSnapshot | null | undefined,
): QiCardHealth {
  const axes = computeStudioQualityAxes(revision, technical);
  if (!axes) return "neutral";
  const avg = studioQualityAverage(axes);
  if (avg < 55) return "alert";
  if (avg < 80) return "watch";
  return "ok";
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="esti-qi-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StudioQualityRadarTile({
  revision,
  technical,
  loading,
  chartTheme = "white",
}: {
  revision: RevisionIntelligenceSnapshot | null | undefined;
  technical: TechnicalIntelligenceSnapshot | null | undefined;
  loading?: boolean;
  chartTheme?: string;
}) {
  const axes = computeStudioQualityAxes(revision, technical);
  const health = studioProfileHealth(revision, technical);
  const avg = axes ? studioQualityAverage(axes) : null;

  return (
    <Tile className="esti-fill esti-qi-tile" style={qiEdge(health)}>
      <Stack gap={5}>
        <div className="esti-qi-header">
          <h4>Studio quality profile</h4>
          {revision && axes && (
            <Tag type={RISK_TAG[revision.revisionRiskBand]} size="sm">
              {revision.revisionRiskBand} risk · avg {avg}
            </Tag>
          )}
        </div>
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : !axes ? (
          <p className="esti-qi-empty">Record CRIF decisions to build a quality profile.</p>
        ) : (
          <div className="esti-qi-chart esti-qi-chart--radar">
            <RadarChart
              data={buildRadarChartData(axes)}
              options={{
                data: { groupMapsTo: "group" },
                radar: { axes: { angle: "feature", value: "score" }, alignment: "center" },
                height: QI_RADAR_HEIGHT,
                theme: chartTheme,
                toolbar: { enabled: false },
                legend: { enabled: false },
                tooltip: { valueFormatter: (v: number) => `${v}` },
                accessibility: { svgAriaLabel: "Studio quality profile by dimension" },
              }}
            />
          </div>
        )}
      </Stack>
    </Tile>
  );
}

export function RevisionIntelligenceTile({
  data,
  loading,
  chartTheme = "white",
}: {
  data: RevisionIntelligenceSnapshot | null | undefined;
  loading?: boolean;
  chartTheme?: string;
}) {
  const health = revisionHealth(data);
  const empty = !data || data.totalDecisions === 0;
  const sourceData = data && !empty ? buildRevisionSourceMeterData(data) : [];

  return (
    <Tile className="esti-fill esti-qi-tile" style={qiEdge(health)}>
      <Stack gap={5}>
        <div className="esti-qi-header">
          <h4>Revisions</h4>
          {data && !empty && (
            <Tag type={RISK_TAG[data.revisionRiskBand]} size="sm">
              {data.revisionRiskBand} risk · {data.healthScore}
            </Tag>
          )}
        </div>
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : empty ? (
          <p className="esti-qi-empty">No decisions recorded yet.</p>
        ) : (
          <>
            <div className="esti-qi-metrics">
              <MetricRow label="Client driven" value={data.clientDriven} />
              <MetricRow label="Internal error" value={data.internalError} />
              <MetricRow label="Technical query" value={data.technicalQuery} />
              <MetricRow label="Scope change" value={data.scopeChange} />
              <MetricRow label="Scope drift" value={`${data.scopeDriftPct}%`} />
            </div>
            {sourceData.length > 0 && (
              <div className="esti-qi-chart esti-qi-chart--meter">
                <p className="esti-qi-chart-label">Decision sources</p>
                <MeterChart
                  data={sourceData}
                  options={{
                    data: { groupMapsTo: "group" },
                    height: QI_METER_HEIGHT,
                    theme: chartTheme,
                    toolbar: { enabled: false },
                    legend: { enabled: true, position: "bottom" as const },
                    accessibility: { svgAriaLabel: "Revision decision sources" },
                    meter: {
                      proportional: {
                        total: data.totalDecisions,
                        unit: "decisions",
                      },
                    },
                  }}
                />
              </div>
            )}
          </>
        )}
      </Stack>
    </Tile>
  );
}

export function TechnicalQualityTile({
  data,
  loading,
  className,
}: {
  data: TechnicalIntelligenceSnapshot | null | undefined;
  loading?: boolean;
  className?: string;
}) {
  const health = technicalHealth(data);
  const tileClass = className
    ? `esti-fill esti-qi-tile ${className}`
    : "esti-fill esti-qi-tile";

  return (
    <Tile className={tileClass} style={qiEdge(health)}>
      <Stack gap={5}>
        <div className="esti-qi-header">
          <h4>Technical quality</h4>
        </div>
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : !data ? (
          <p className="esti-qi-empty">No data.</p>
        ) : (
          <div className="esti-qi-metrics esti-qi-metrics--wide">
            <MetricRow label="Drawing accuracy" value={`${data.drawingAccuracyPct}%`} />
            <MetricRow label="Site query rate" value={`${data.siteQueryRate}%`} />
            <MetricRow label="Internal errors" value={data.internalErrors} />
            <MetricRow label="Technical queries" value={data.techQueries} />
            <MetricRow label="Drawings issued" value={data.totalDrawings} />
          </div>
        )}
      </Stack>
    </Tile>
  );
}

export function QualityIntelligenceTiles({
  revision,
  technical,
  revisionLoading,
  technicalLoading,
  className,
  chartTheme = "white",
}: {
  revision: RevisionIntelligenceSnapshot | null | undefined;
  technical: TechnicalIntelligenceSnapshot | null | undefined;
  revisionLoading?: boolean;
  technicalLoading?: boolean;
  className?: string;
  chartTheme?: string;
}) {
  const rootClass = className ? `esti-qi-layout ${className}` : "esti-qi-layout";

  return (
    <div className={rootClass}>
      <StudioQualityRadarTile
        revision={revision}
        technical={technical}
        loading={revisionLoading || technicalLoading}
        chartTheme={chartTheme}
      />
      <RevisionIntelligenceTile
        data={revision}
        loading={revisionLoading}
        chartTheme={chartTheme}
      />
      <TechnicalQualityTile
        data={technical}
        loading={technicalLoading}
        className="esti-qi-tile--wide"
      />
    </div>
  );
}

/** Demo snapshot for the marketing landing — aligned with studio demo seed data. */
export const QUALITY_INTELLIGENCE_DEMO: {
  revision: RevisionIntelligenceSnapshot;
  technical: TechnicalIntelligenceSnapshot;
} = {
  revision: {
    revisionRiskBand: "MEDIUM",
    healthScore: 72,
    clientDriven: 14,
    internalError: 3,
    technicalQuery: 5,
    scopeChange: 6,
    scopeDriftPct: 24,
    totalDecisions: 28,
  },
  technical: {
    drawingAccuracyPct: 92,
    siteQueryRate: 8,
    internalErrors: 3,
    techQueries: 5,
    totalDrawings: 186,
  },
};
