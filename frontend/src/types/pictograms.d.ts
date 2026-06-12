// Local stub for @carbon/pictograms-react — add names here as we use them.
// Props mirror an SVG icon (width/height accepted).
declare module "@carbon/pictograms-react" {
  import type { FC, SVGProps } from "react";
  export type Pictogram = FC<
    SVGProps<SVGSVGElement> & {
      width?: number | string;
      height?: number | string;
    }
  >;
  // Existing
  export const Banking: Pictogram;
  export const Building: Pictogram;
  export const ChartLine: Pictogram;
  export const Receipt: Pictogram;
  // Dashboard additions
  export const Analytics: Pictogram;
  export const AuditTrail: Pictogram;
  export const ChartBar: Pictogram;
  export const ChartDonut: Pictogram;
  export const CollaborateWithTeams: Pictogram;
  export const DataInsights: Pictogram;
  export const FinanceAndOperations: Pictogram;
  export const FinanceStrategy: Pictogram;
  export const Performance: Pictogram;
  export const TeamAlignment: Pictogram;
  export const Time: Pictogram;
  export const Warning_01: Pictogram;
  export const Workflows: Pictogram;
}
