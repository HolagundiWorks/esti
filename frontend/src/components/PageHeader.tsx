import { Stack } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Standard staff-route page title block — h1, optional lead, optional actions.
 *
 * Migrated to Material UI (Carbon → MUI migration). The API is unchanged so all
 * call sites keep working untouched. Semantic <h1>/<p> are kept (not MUI
 * Typography) so the existing Carbon/Google-Sans type scale still applies; only
 * the layout primitive (Carbon Stack → MUI Stack) changed. Spacing maps 1:1:
 * Carbon gap 3 = 8px = MUI spacing 1; gap 5 = 16px = MUI spacing 2.
 */
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
      <Stack spacing={1}>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "flex-start" }}
      className="esti-page-header"
    >
      <Stack spacing={1} className="esti-grow">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </Stack>
      {actions}
    </Stack>
  );
}
