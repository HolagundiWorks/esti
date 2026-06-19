import { Stack } from "@carbon/react";
import type { ElementType, ReactNode } from "react";

/** Standard section title block for the marketing landing page. */
export function LandingSectionHead({
  eyebrow,
  title,
  lead,
  icon: Icon,
  actions,
  titleId,
}: {
  eyebrow?: ReactNode;
  title: string;
  lead?: string;
  icon?: ElementType;
  actions?: ReactNode;
  titleId?: string;
}) {
  if (actions) {
    return (
      <Stack orientation="horizontal" gap={5} className="esti-page-header">
        <Stack gap={3} className="esti-grow">
          {eyebrow && <p>{eyebrow}</p>}
          <Stack orientation="horizontal" gap={3}>
            {Icon && <Icon size={24} aria-hidden />}
            <h2 id={titleId}>{title}</h2>
          </Stack>
          {lead && <p>{lead}</p>}
        </Stack>
        {actions}
      </Stack>
    );
  }

  return (
    <Stack gap={3}>
      {eyebrow && <p>{eyebrow}</p>}
      <Stack orientation="horizontal" gap={3}>
        {Icon && <Icon size={24} aria-hidden />}
        <h2 id={titleId}>{title}</h2>
      </Stack>
      {lead && <p>{lead}</p>}
    </Stack>
  );
}
