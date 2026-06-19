import { Column, Grid } from "@carbon/react";
import { Children, isValidElement, type ReactNode } from "react";

/**
 * Carbon 2x Grid column spans — divide the fluid grid by two at each breakpoint.
 * sm: 4 cols · md: 8 cols · lg: 16 cols
 *
 * @see https://carbondesignsystem.com/elements/2x-grid/overview/
 */
export const LANDING_2X_COLS = {
  /** One tile per row */
  full: { sm: 4, md: 8, lg: 16 },
  /** Two tiles per row on lg/md */
  half: { sm: 4, md: 4, lg: 8 },
  /** Four tiles per row on lg; two on md */
  quarter: { sm: 4, md: 4, lg: 4 },
} as const;

export type LandingTileColumns = 1 | 2 | 3 | 4;

type ColSpan = {
  sm: number;
  md: number;
  lg: number;
  mdOffset?: number;
  lgOffset?: number;
};

const TILE_COLS: Record<Exclude<LandingTileColumns, 3>, ColSpan> = {
  1: LANDING_2X_COLS.full,
  2: LANDING_2X_COLS.half,
  4: LANDING_2X_COLS.quarter,
};

/** 5 + 5 + 5 + lgOffset 1 = 16 columns on large; stacked full-width on md/sm */
const TILE_COLS_3: ColSpan[] = [
  { sm: 4, md: 8, lg: 5, lgOffset: 1 },
  { sm: 4, md: 8, lg: 5 },
  { sm: 4, md: 8, lg: 5 },
];

function columnProps(columns: LandingTileColumns, index: number): ColSpan {
  if (columns === 3) {
    return TILE_COLS_3[index] ?? TILE_COLS_3[TILE_COLS_3.length - 1]!;
  }
  return TILE_COLS[columns];
}

/**
 * Carbon CSS Grid wrapper — each child is placed in a 2x-aligned Column.
 */
export function MarketingTileGrid({
  columns = 2,
  children,
  className,
}: {
  columns?: LandingTileColumns;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Grid fullWidth className={["esti-landing-grid", className].filter(Boolean).join(" ")}>
      {Children.toArray(children).map((child, index) => {
        if (!isValidElement(child)) return null;
        const span = columnProps(columns, index);
        return (
          <Column
            key={child.key ?? index}
            sm={span.sm}
            md={span.md}
            lg={span.lg}
            mdOffset={span.mdOffset}
            lgOffset={span.lgOffset}
          >
            {child}
          </Column>
        );
      })}
    </Grid>
  );
}
