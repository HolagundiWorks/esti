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
  if (data.drawingClarityScore < 75 || data.siteQueryRate > 25) return "alert";
  if (data.drawingClarityScore < 90 || data.siteQueryRate > 10) return "watch";
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
    <div className="esti-qi-metric esti-lp-qi-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StudioQualityRadarTile({
  revision,
  technical,
  chartRevision,
  chartTechnical,
  loading,
  chartTheme = "white",
  chartAnimations = true,
}: {
  revision: RevisionIntelligenceSnapshot | null | undefined;
  technical: TechnicalIntelligenceSnapshot | null | undefined;
  /** Stable snapshot for chart rendering (landing preview — avoids Carbon Charts update errors). */
  chartRevision?: RevisionIntelligenceSnapshot | null;
  chartTechnical?: TechnicalIntelligenceSnapshot | null;
  loading?: boolean;
  chartTheme?: string;
  chartAnimations?: boolean;
}) {
  const axes = computeStudioQualityAxes(
    chartRevision ?? revision,
    chartTechnical ?? technical,
  );
  const health = studioProfileHealth(revision, technical);
  const avg = axes ? studioQualityAverage(axes) : null;
  const showChart = !!axes;

  return (
    <Tile className="esti-fill esti-qi-tile esti-lp-qi-tile esti-lp-qi-tile--radar" style={qiEdge(health)}>
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
        ) : !showChart ? (
          <p className="esti-qi-empty">Record CRIF decisions to build a quality profile.</p>
        ) : (
          <div className="esti-qi-chart esti-qi-chart--radar esti-lp-qi-chart">
            <RadarChart
              key={axes!.map((a) => `${a.feature}:${a.score}`).join("|")}
              data={buildRadarChartData(axes!)}
              options={{
                data: { groupMapsTo: "group" },
                radar: { axes: { angle: "feature", value: "score" }, alignment: "center" },
                height: QI_RADAR_HEIGHT,
                theme: chartTheme,
                toolbar: { enabled: false },
                legend: { enabled: false },
                tooltip: { valueFormatter: (v: number) => `${v}` },
                animations: chartAnimations,
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
  chartData,
  loading,
  chartTheme = "white",
  hasData,
  chartAnimations = true,
}: {
  data: RevisionIntelligenceSnapshot | null | undefined;
  /** Stable snapshot for meter chart (landing preview). */
  chartData?: RevisionIntelligenceSnapshot | null;
  loading?: boolean;
  chartTheme?: string;
  hasData?: boolean;
  chartAnimations?: boolean;
}) {
  const health = revisionHealth(data);
  const empty = !data || data.totalDecisions === 0;
  const showContent = hasData ?? !empty;
  const meterRevision = chartData ?? data;
  const sourceData =
    meterRevision && showContent ? buildRevisionSourceMeterData(meterRevision, !!hasData) : [];

  return (
    <Tile className="esti-fill esti-qi-tile esti-lp-qi-tile esti-lp-qi-tile--revision" style={qiEdge(health)}>
      <Stack gap={5}>
        <div className="esti-qi-header">
          <h4>Revisions</h4>
          {data && showContent && (
            <Tag type={RISK_TAG[data.revisionRiskBand]} size="sm">
              {data.revisionRiskBand} risk · {data.healthScore}
            </Tag>
          )}
        </div>
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : !showContent ? (
          <p className="esti-qi-empty">No decisions recorded yet.</p>
        ) : (
          <>
            <div className="esti-qi-metrics esti-lp-qi-metrics">
              <MetricRow label="Client driven" value={data!.clientDriven} />
              <MetricRow label="Internal error" value={data!.internalError} />
              <MetricRow label="Technical query" value={data!.technicalQuery} />
              <MetricRow label="Scope change" value={data!.scopeChange} />
              <MetricRow label="Scope drift" value={`${data!.scopeDriftPct}%`} />
            </div>
            {sourceData.length > 0 && (
              <div className="esti-qi-chart esti-qi-chart--meter esti-lp-qi-chart">
                <p className="esti-qi-chart-label">Decision sources</p>
                <MeterChart
                  key={sourceData.map((d) => `${d.group}:${d.value}`).join("|")}
                  data={sourceData}
                  options={{
                    data: { groupMapsTo: "group" },
                    height: QI_METER_HEIGHT,
                    theme: chartTheme,
                    toolbar: { enabled: false },
                    legend: { enabled: true, position: "bottom" as const },
                    animations: chartAnimations,
                    accessibility: { svgAriaLabel: "Revision decision sources" },
                    meter: {
                      proportional: {
                        total: Math.max(1, meterRevision!.totalDecisions),
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
  hasData,
}: {
  data: TechnicalIntelligenceSnapshot | null | undefined;
  loading?: boolean;
  className?: string;
  hasData?: boolean;
}) {
  const health = technicalHealth(data);
  const tileClass = className
    ? `esti-fill esti-qi-tile esti-lp-qi-tile esti-lp-qi-tile--technical ${className}`
    : "esti-fill esti-qi-tile esti-lp-qi-tile esti-lp-qi-tile--technical";
  const showContent = hasData ?? !!data;

  return (
    <Tile className={tileClass} style={qiEdge(health)}>
      <Stack gap={5}>
        <div className="esti-qi-header">
          <h4>Technical quality</h4>
        </div>
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : !showContent ? (
          <p className="esti-qi-empty">No data.</p>
        ) : (
          <div className="esti-qi-metrics esti-qi-metrics--wide esti-lp-qi-metrics">
            <MetricRow label="Drawing clarity" value={`${data!.drawingClarityScore}%`} />
            <MetricRow label="Site query rate" value={`${data!.siteQueryRate}%`} />
            <MetricRow label="Repeat query rate" value={`${data!.repeatQueryRate}%`} />
            <MetricRow label="Drawing accuracy" value={`${data!.drawingAccuracyPct}%`} />
            <MetricRow label="Issued drawings" value={data!.issuedDrawings} />
            <MetricRow label="Internal errors" value={data!.internalErrors} />
            <MetricRow label="Technical queries" value={data!.techQueries} />
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
  animSource,
  chartAnimations = true,
}: {
  revision: RevisionIntelligenceSnapshot | null | undefined;
  technical: TechnicalIntelligenceSnapshot | null | undefined;
  revisionLoading?: boolean;
  technicalLoading?: boolean;
  className?: string;
  chartTheme?: string;
  chartAnimations?: boolean;
  /** When set, tiles treat source snapshots as “has data” while values animate from zero. */
  animSource?: {
    revision: RevisionIntelligenceSnapshot;
    technical: TechnicalIntelligenceSnapshot;
  };
}) {
  const rootClass = className ? `esti-qi-layout ${className}` : "esti-qi-layout";
  const revisionReady = animSource?.revision ?? revision;
  const technicalReady = animSource?.technical ?? technical;
  const freezeCharts = !chartAnimations && !!animSource;

  return (
    <div className={rootClass}>
      <StudioQualityRadarTile
        revision={revision}
        technical={technical}
        chartRevision={freezeCharts ? animSource!.revision : undefined}
        chartTechnical={freezeCharts ? animSource!.technical : undefined}
        loading={revisionLoading || technicalLoading}
        chartTheme={chartTheme}
        chartAnimations={chartAnimations}
      />
      <RevisionIntelligenceTile
        data={revision}
        chartData={freezeCharts ? animSource!.revision : undefined}
        loading={revisionLoading}
        chartTheme={chartTheme}
        chartAnimations={chartAnimations}
        hasData={!!(revisionReady && revisionReady.totalDecisions > 0)}
      />
      <TechnicalQualityTile
        data={technical}
        loading={technicalLoading}
        className="esti-qi-tile--wide"
        hasData={!!technicalReady}
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
    repeatQueryRate: 12,
    drawingClarityScore: 88,
    issuedDrawings: 186,
    internalErrors: 3,
    techQueries: 5,
    totalDrawings: 186,
  },
};
