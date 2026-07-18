import { type ReactNode } from "react";
import { MarketingShell } from "./landing/MarketingShell.js";

/** Public auth pages — marketing rail + sign-in / recovery form on the stage. */
export function PublicAuthStageLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell contours showConversionDock={false} showFooter={false} vertical="platform">
      <div className="lp2-ds esti-auth-stage-page">
        <div className="esti-form-panel esti-auth-stage-form">{children}</div>
      </div>
    </MarketingShell>
  );
}
