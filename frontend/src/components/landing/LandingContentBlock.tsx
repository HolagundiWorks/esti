import { Stack } from "@carbon/react";
import type { ElementType, ReactNode } from "react";

/**
 * IBM.com content block — section heading group above a row of cards or media.
 */
export function LandingContentBlock({
  eyebrow,
  title,
  titleId,
  lead,
  icon: Icon,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  titleId?: string;
  lead?: string;
  icon?: ElementType;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Stack gap={7} className="esti-landing-content-block">
      <Stack
        orientation={actions ? "horizontal" : "vertical"}
        gap={5}
        className={actions ? "esti-page-header" : undefined}
      >
        <Stack gap={3} className={actions ? "esti-grow" : undefined}>
          {eyebrow && <p className="esti-landing-eyebrow">{eyebrow}</p>}
          <Stack orientation="horizontal" gap={3}>
            {Icon && <Icon size={24} aria-hidden />}
            <h2 id={titleId} className="esti-landing-section-title">
              {title}
            </h2>
          </Stack>
          {lead && <p className="esti-landing-section-lead">{lead}</p>}
        </Stack>
        {actions}
      </Stack>
      {children}
    </Stack>
  );
}
