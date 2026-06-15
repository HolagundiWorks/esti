import { Stack } from "@carbon/react";
import type { ReactNode } from "react";

/** Standard staff-route page title block — h1, optional lead, optional actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  if (!actions) {
    return (
      <Stack gap={3}>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </Stack>
    );
  }

  return (
    <Stack orientation="horizontal" gap={5} className="esti-page-header">
      <Stack gap={3} className="esti-grow">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </Stack>
      {actions}
    </Stack>
  );
}
