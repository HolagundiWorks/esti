import { Tag } from "@carbon/react";
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
  return (
    <Tag type={map[value] ?? "gray"} size={size}>
      {label ?? value}
    </Tag>
  );
}
