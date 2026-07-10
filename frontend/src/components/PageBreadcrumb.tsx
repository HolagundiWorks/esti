import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export type Crumb = { label: string; to?: string };

/**
 * Wayfinding trail for deep screens (Miller / Nielsen #3). Last crumb is the
 * current page (non-link). Keep labels short.
 */
export function PageBreadcrumb({ items, "aria-label": ariaLabel = "Breadcrumb" }: { items: Crumb[]; "aria-label"?: string }) {
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
