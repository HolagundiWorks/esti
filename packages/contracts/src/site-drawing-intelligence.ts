/** Site & drawing intelligence metrics — shared by dashboard and quality tiles. */

export type TechnicalIntelligenceSnapshot = {
  totalDrawings: number;
  issuedDrawings: number;
  internalErrors: number;
  techQueries: number;
  /** TECHNICAL_QUERY count ÷ issued drawings (0–100). */
  siteQueryRate: number;
  /** Drawings with 2+ site queries ÷ drawings with any query (0–100). */
  repeatQueryRate: number;
  /** Legacy accuracy from internal-error share of all decisions (0–100). */
  drawingAccuracyPct: number;
  /** 100 minus query / repeat / error penalties on issued drawings (0–100). */
  drawingClarityScore: number;
};

export type SiteDrawingIntelligenceInput = {
  totalDrawings: number;
  issuedDrawings: number;
  internalErrors: number;
  techQueries: number;
  queriedDrawings: number;
  repeatQueryDrawings: number;
  totalDecisions: number;
};

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Derive dashboard technical-intelligence KPIs from raw counts. */
export function computeSiteDrawingIntelligence(
  input: SiteDrawingIntelligenceInput,
): TechnicalIntelligenceSnapshot {
  const {
    totalDrawings,
    issuedDrawings,
    internalErrors,
    techQueries,
    queriedDrawings,
    repeatQueryDrawings,
    totalDecisions,
  } = input;

  const siteQueryRate =
    issuedDrawings > 0 ? clampScore((techQueries / issuedDrawings) * 100) : 0;

  const repeatQueryRate =
    queriedDrawings > 0
      ? clampScore((repeatQueryDrawings / queriedDrawings) * 100)
      : 0;

  const errorRate = totalDecisions > 0 ? internalErrors / totalDecisions : 0;
  const drawingAccuracyPct = clampScore((1 - errorRate) * 100);

  const internalErrorOnIssued =
    issuedDrawings > 0 ? (internalErrors / issuedDrawings) * 100 : 0;
  const penalty =
    siteQueryRate * 0.45 + repeatQueryRate * 0.35 + internalErrorOnIssued * 0.2;
  const drawingClarityScore = clampScore(100 - penalty);

  return {
    totalDrawings,
    issuedDrawings,
    internalErrors,
    techQueries,
    siteQueryRate,
    repeatQueryRate,
    drawingAccuracyPct,
    drawingClarityScore,
  };
}
