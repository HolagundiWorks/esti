import { ClickableTile, Stack, Tile } from "@carbon/react";
import type { ReactNode } from "react";

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

export function MarketingFeatureClickableTile({
  children,
  className,
  footer,
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <ClickableTile
      className={["esti-landing-feature-tile", className].filter(Boolean).join(" ")}
      onClick={onClick}
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
    </ClickableTile>
  );
}
