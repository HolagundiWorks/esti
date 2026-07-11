import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";

export type Crumb = { label: string; to?: string };

/**
 * Wayfinding trail for deep screens (Miller / Nielsen #3). Last crumb is the
 * current page (non-link). Keep labels short.
 *
 * Also sets `document.title` from the last crumb so browser tabs and history
 * are distinguishable (Nielsen #1 — visibility of location). Workspace routes
 * otherwise share one static title.
 */
export function PageBreadcrumb({ items, "aria-label": ariaLabel = "Breadcrumb" }: { items: Crumb[]; "aria-label"?: string }) {
  const currentLabel = items[items.length - 1]?.label ?? "";
  useEffect(() => {
    if (currentLabel) document.title = `${currentLabel} · AORMS`;
  }, [currentLabel]);
  if (items.length === 0) return null;
  return (
    <Breadcrumbs
      aria-label={ariaLabel}
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ mb: 1, "& .MuiBreadcrumbs-ol": { flexWrap: "wrap" } }}
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        if (!last && c.to) {
          return (
            <MuiLink
              key={`${c.label}-${i}`}
              component={RouterLink}
              to={c.to}
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
