import { Chip } from "@mui/material";
import type { ReactNode } from "react";
import type { TagColor } from "@esti/contracts";

/**
 * The one status-badge primitive. Every status/enum column renders through this
 * so colour choices live in a single shared map (in `@esti/contracts`) rather
 * than being re-derived with a per-route ternary. Pass the centralised map and
 * the raw value; an optional `label` overrides the displayed text (defaults to
 * the value). Unknown values fall back to a neutral `gray` tag.
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
  // Preserve exact Carbon tag colours by rendering an MUI Chip over the
  // `--cds-tag-*` token vars (still defined by the Carbon token layer).
  const color = map[value] ?? "gray";
  return (
    <Chip
      label={label ?? value}
      size={size === "md" ? "medium" : "small"}
      sx={{
        backgroundColor: `var(--cds-tag-background-${color}, var(--cds-layer-01))`,
        color: `var(--cds-tag-color-${color}, var(--cds-text-primary))`,
      }}
    />
  );
}
