import { Stack } from "@carbon/react";

export function MarketingSectionHead({
  id,
  eyebrow,
  title,
  lead,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <Stack gap={5}>
      <p className="esti-landing-eyebrow">{eyebrow}</p>
      <h2 id={id} className="esti-landing-section-title">
        {title}
      </h2>
      <p className="esti-landing-section-lead">{lead}</p>
    </Stack>
  );
}
