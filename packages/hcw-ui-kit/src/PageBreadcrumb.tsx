/**
 * PageBreadcrumb — wayfinding trail for deep screens (Miller / Nielsen #3).
 * Last crumb is the current page (non-link, semibold). Keep labels short.
 *
 * Router-agnostic by injection: the kit takes any `linkComponent` (react-router's
 * `Link`, Next's `Link`, plain `a`) plus the prop name it expects for the target —
 * so the kit carries no router dependency.
 *
 *   // plain anchors (default)
 *   <PageBreadcrumb items={[{ label: "Library", to: "/library" }, { label: "Standards" }]} />
 *   // react-router
 *   <PageBreadcrumb items={…} linkComponent={RouterLink} linkPropName="to" />
 */
import { Box, Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import type { ElementType } from "react";

export type Crumb = { label: string; to?: string };

export function PageBreadcrumb({
  items,
  linkComponent = "a",
  linkPropName = "href",
  "aria-label": ariaLabel = "Breadcrumb",
}: {
  items: Crumb[];
  /** Component used for link crumbs (e.g. react-router `Link`). */
  linkComponent?: ElementType;
  /** Prop the link component expects for its target (`href` | `to`). */
  linkPropName?: "href" | "to";
  "aria-label"?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Breadcrumbs
      aria-label={ariaLabel}
      separator={
        // Glyph separator — the kit stays icon-library-free (no icons peer dep).
        <Box component="span" aria-hidden sx={{ color: "text.disabled", lineHeight: 1 }}>
          ›
        </Box>
      }
      sx={{ mb: 1, "& .MuiBreadcrumbs-ol": { flexWrap: "wrap" } }}
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        if (!last && c.to) {
          const linkProps = { [linkPropName]: c.to } as Record<string, string>;
          return (
            <MuiLink
              key={`${c.label}-${i}`}
              component={linkComponent}
              {...linkProps}
              underline="hover"
              color="text.secondary"
              variant="caption"
            >
              {c.label}
            </MuiLink>
          );
        }
        return (
          <Typography key={`${c.label}-${i}`} variant="caption" color="text.primary" sx={{ fontWeight: last ? 600 : 400 }}>
            {c.label}
          </Typography>
        );
      })}
    </Breadcrumbs>
  );
}

export default PageBreadcrumb;
