import { Stack, Tile } from "@carbon/react";
import type { ReactNode } from "react";

/**
 * Marketing landing tile — Carbon Tile with consistent padding, border, and band contrast.
 */
export function MarketingFeatureTile({
  children,
  className,
  centered,
  footer,
}: {
  children?: ReactNode;
  className?: string;
  centered?: boolean;
  footer?: ReactNode;
}) {
  return (
    <Tile
      className={[
        "esti-fill",
        "esti-landing-feature-tile",
        centered && "esti-landing-feature-tile--centered",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children ?
        <Stack gap={5} className="esti-landing-feature-tile__content">
          {children}
        </Stack>
      : null}
      {footer ?
        <Stack gap={3} className="esti-landing-feature-tile__footer">
          {footer}
        </Stack>
      : null}
    </Tile>
  );
}
