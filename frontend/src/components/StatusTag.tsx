import { Box } from "@mui/material";
import type { ReactNode } from "react";
import type { TagColor } from "@esti/contracts";

/**
 * A status indicator — a coloured **dot + text** (not a colour-filled chip). The
 * dot carries the status colour (a `--cds-tag-*` token); the label reads in normal
 * ink. Use for any status/enum badge.
 *
 *   <StatusDot color="green" label="Approved" />
 */
export function StatusDot({
  color = "gray",
  label,
  size = "sm",
}: {
  color?: TagColor | string;
  label: ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, whiteSpace: "nowrap", lineHeight: 1.2 }}
    >
      <Box
        component="span"
        className={`esti-status-dot${size === "md" ? " esti-status-dot--md" : ""}`}
        sx={{ backgroundColor: `var(--cds-tag-color-${color}, var(--cds-text-primary))` }}
      />
      <Box component="span" sx={{ fontSize: size === "md" ? "0.875rem" : "0.75rem", color: "text.primary" }}>
        {label}
      </Box>
    </Box>
  );
}

/**
 * The one status-badge primitive. Every status/enum column renders through this
 * so colour choices live in a single shared map (in `@esti/contracts`). Renders as
 * a coloured dot + text; unknown values fall back to neutral `gray`.
 *
 *   <StatusTag value={iv.status} map={INVOICE_STATUS_TAG} />
 *   <StatusTag value={p.status} map={PROJECT_STATUS_TAG} label={PROJECT_STATUS_LABEL[p.status]} />
 */
export function StatusTag<T extends string>({
  value,
  map,
  label,
  size = "sm",
}: {
  value: T;
  map: Record<T, TagColor>;
  label?: ReactNode;
  size?: "sm" | "md";
}) {
  return <StatusDot color={map[value] ?? "gray"} label={label ?? value} size={size} />;
}
