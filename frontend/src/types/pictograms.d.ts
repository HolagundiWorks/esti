// @carbon/pictograms-react ships JS (es/lib/umd) without TypeScript types.
// Declare the pictograms we use so named imports type-check; props mirror an
// SVG icon (width/height accepted).
declare module "@carbon/pictograms-react" {
  import type { FC, SVGProps } from "react";
  export type Pictogram = FC<
    SVGProps<SVGSVGElement> & { width?: number | string; height?: number | string }
  >;
  export const Building: Pictogram;
  export const Receipt: Pictogram;
  export const Banking: Pictogram;
  export const ChartLine: Pictogram;
}
