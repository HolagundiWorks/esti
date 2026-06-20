import { Stack } from "@carbon/react";
import type { ReactNode } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

type BandVariant = "default" | "lead" | "muted" | "contrast";

export function MarketingBandSection({
  id,
  variant = "default",
  eyebrow,
  title,
  lead,
  titleId,
  children,
  className,
}: {
  id: string;
  variant?: BandVariant;
  eyebrow: string;
  title: string;
  lead: string;
  titleId?: string;
  children: ReactNode;
  className?: string;
}) {
  const headId = titleId ?? `${id}-title`;

  return (
    <LandingBand
      id={id}
      variant={variant}
      ariaLabelledby={headId}
      className={className}
    >
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead id={headId} eyebrow={eyebrow} title={title} lead={lead} />
          {children}
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
