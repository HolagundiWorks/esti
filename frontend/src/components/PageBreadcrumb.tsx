/**
 * PageBreadcrumb — app wrapper over the kit primitive (promoted 2026-07).
 * Injects react-router's Link (the kit is router-agnostic) and sets
 * `document.title` from the last crumb so browser tabs/history are
 * distinguishable (Nielsen #1) — an app behaviour, not a kit one.
 */
import { useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PageBreadcrumb as KitPageBreadcrumb, type Crumb } from "@hcw/ui-kit";

export type { Crumb };

export function PageBreadcrumb({ items, "aria-label": ariaLabel }: { items: Crumb[]; "aria-label"?: string }) {
  const currentLabel = items[items.length - 1]?.label ?? "";
  useEffect(() => {
    if (currentLabel) document.title = `${currentLabel} · AORMS`;
  }, [currentLabel]);
  return (
    <KitPageBreadcrumb
      items={items}
      linkComponent={RouterLink}
      linkPropName="to"
      aria-label={ariaLabel}
    />
  );
}
