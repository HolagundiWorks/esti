import { Column, Grid, SkeletonPlaceholder } from "@carbon/react";

/**
 * Loading skeleton for tile/card grids (mirrors the roster grid's columns).
 * Pass to `DataState`'s `skeleton` prop so card-grid screens get the same
 * Carbon-native loading treatment that table screens get from DataTableSkeleton.
 */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Grid narrow>
      {Array.from({ length: count }).map((_, i) => (
        <Column key={i} lg={3} md={2} sm={2}>
          <SkeletonPlaceholder className="esti-card-skeleton" />
        </Column>
      ))}
    </Grid>
  );
}
