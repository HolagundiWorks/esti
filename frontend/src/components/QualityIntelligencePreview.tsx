/**
 * Static preview of the Dashboard "Quality intelligence" zone for the marketing landing.
 */
import {
  QUALITY_INTELLIGENCE_DEMO,
  QualityIntelligenceTiles,
} from "./QualityIntelligenceTiles.js";

export function QualityIntelligencePreview() {
  return (
    <div aria-hidden>
      <QualityIntelligenceTiles
        className="esti-qi-tiles--landing"
        revision={QUALITY_INTELLIGENCE_DEMO.revision}
        technical={QUALITY_INTELLIGENCE_DEMO.technical}
      />
    </div>
  );
}
