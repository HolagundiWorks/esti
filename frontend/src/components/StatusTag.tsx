import type { ReactNode } from "react";
import { StatusDot as KitStatusDot } from "@hcw/ui-kit";
import type { TagColor } from "@esti/contracts";

/**
 * Status indicators — thin app-typed wrappers over the kit's canonical
 * `StatusDot` (`@hcw/ui-kit`): a coloured **dot + ink text**, never a
 * colour-filled chip. The kit owns the hues (`STATUS_COLORS`); this file only
 * adds the `TagColor`/status-map typing from `@esti/contracts`.
 *
 *   <StatusDot color="green" label="Approved" />
 *   <StatusTag value={iv.status} map={INVOICE_STATUS_TAG} />
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
  return <KitStatusDot color={color} label={label} size={size} />;
}

/**
 * The one status-badge primitive. Every status/enum column renders through this
 * so colour choices live in a single shared map (in `@esti/contracts`). Unknown
 * values fall back to neutral `gray`.
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
