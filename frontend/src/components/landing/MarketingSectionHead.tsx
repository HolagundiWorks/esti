import { Stack } from "@carbon/react";

export function MarketingSectionHead({
  id,
  eyebrow,
  title,
  lead,
  centered,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  centered?: boolean;
}) {
  return (
    <Stack gap={5} className={centered ? "esti-lp-head-centered" : undefined}>
      <p className="esti-landing-eyebrow">{eyebrow}</p>
      <h2 id={id} className="esti-landing-section-title">
        {title}
      </h2>
      <p className="esti-landing-section-lead">{lead}</p>
    </Stack>
  );
}
