import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Standard staff-route page title block — title, optional lead, optional actions.
 *
 * Reference for the MUI System standard: layout via `Box` + `sx`, type via
 * `Typography` (h4 scale, semantic `component="h1"`). No Carbon, no raw h1/p.
 * API unchanged so all call sites keep working.
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
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ flex: 1, minWidth: 0, borderLeft: 3, borderLeftColor: "primary.main", pl: 1.5 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}
