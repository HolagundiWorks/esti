import { Grid, Skeleton } from "@mui/material";

/**
 * Loading skeleton for tile/card grids (mirrors the roster grid's columns).
 * Pass to `DataState`'s `skeleton` prop so card-grid screens get the same
 * loading treatment table screens get. Material UI (Carbon → MUI migration).
 */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Grid container spacing={1}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid key={i} size={{ xs: 6, md: 3, lg: 2 }}>
          <Skeleton variant="rectangular" height={96} className="esti-card-skeleton" />
        </Grid>
      ))}
    </Grid>
  );
}
