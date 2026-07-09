import { Surface } from "@hcw/ui-kit";
import { Stack, Tab, Tabs, Typography } from "@mui/material";
import type { ReactNode, SyntheticEvent } from "react";

/** Shared padding for portal content cards. */
export const portalPaperSx = { p: 3 } as const;

export function PortalPageHeader({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between" }}
    >
      <Stack spacing={0.75} className="esti-grow" sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {meta}
      </Stack>
      {actions && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

export function PortalTabs({
  value,
  onChange,
  labels,
  ariaLabel,
}: {
  value: number;
  onChange: (_e: SyntheticEvent, v: number) => void;
  labels: string[];
  ariaLabel: string;
}) {
  return (
    <Surface layer="flat" sx={{ px: { xs: 1, sm: 2 }, py: 0.5 }}>
      <Tabs
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {labels.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
    </Surface>
  );
}

export function PortalTabPanel({
  active,
  children,
  id,
}: {
  active: boolean;
  children: ReactNode;
  id?: string;
}) {
  if (!active) return null;
  return (
    <Stack id={id} spacing={3}>
      {children}
    </Stack>
  );
}
