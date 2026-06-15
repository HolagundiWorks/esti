export type RevisionIntelligenceSnapshot = {
  revisionRiskBand: "LOW" | "MEDIUM" | "HIGH";
  healthScore: number;
  clientDriven: number;
  internalError: number;
  technicalQuery: number;
  scopeChange: number;
  scopeDriftPct: number;
  totalDecisions: number;
};

export type TechnicalIntelligenceSnapshot = {
  drawingAccuracyPct: number;
  siteQueryRate: number;
  internalErrors: number;
  techQueries: number;
  totalDrawings: number;
};

export const STUDIO_QUALITY_GROUP = "Studio quality";

/** Normalized 0–100 axes for the studio quality radar profile. */
export const STUDIO_QUALITY_FEATURES = [
  "Revision health",
  "Drawing accuracy",
  "Scope control",
  "Internal quality",
  "Site coordination",
] as const;

export type StudioQualityFeature = (typeof STUDIO_QUALITY_FEATURES)[number];

export type StudioQualityAxis = {
  feature: StudioQualityFeature;
  score: number;
};

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Derive comparable 0–100 scores from revision + technical intelligence snapshots. */
export function computeStudioQualityAxes(
  revision: RevisionIntelligenceSnapshot | null | undefined,
  technical: TechnicalIntelligenceSnapshot | null | undefined,
): StudioQualityAxis[] | null {
  if (!revision || revision.totalDecisions === 0 || !technical) return null;

  const internalErrorRate =
    revision.totalDecisions > 0
      ? (revision.internalError / revision.totalDecisions) * 100
      : 0;

  return [
    { feature: "Revision health", score: clampScore(revision.healthScore) },
    { feature: "Drawing accuracy", score: clampScore(technical.drawingAccuracyPct) },
    { feature: "Scope control", score: clampScore(100 - revision.scopeDriftPct) },
    { feature: "Internal quality", score: clampScore(100 - internalErrorRate) },
    { feature: "Site coordination", score: clampScore(100 - technical.siteQueryRate) },
  ];
}

export function buildRadarChartData(
  axes: StudioQualityAxis[],
): { group: string; feature: string; score: number }[] {
  return axes.map((a) => ({
    group: STUDIO_QUALITY_GROUP,
    feature: a.feature,
    score: a.score,
  }));
}

export function buildRevisionSourceMeterData(
  revision: RevisionIntelligenceSnapshot,
): { group: string; value: number }[] {
  return [
    { group: "Client driven", value: revision.clientDriven },
    { group: "Internal error", value: revision.internalError },
    { group: "Technical query", value: revision.technicalQuery },
    { group: "Scope change", value: revision.scopeChange },
  ].filter((d) => d.value > 0);
}

export function studioQualityAverage(axes: StudioQualityAxis[]): number {
  const sum = axes.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / axes.length);
}
