/**
 * Isolated Carbon white-theme shell for dashboard-faithful previews on the marketing page.
 */
import { Theme } from "@carbon/react";
import type { ReactNode } from "react";

export function LandingCarbonZone({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`esti-lp-carbon${wide ? " esti-lp-carbon--wide" : ""}`}>
      <Theme theme="white">{children}</Theme>
    </div>
  );
}
