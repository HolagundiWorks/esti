import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** Standard header + body for an admin console section. */
export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Stack>
        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {children}
      </Stack>
    </Stack>
  );
}
