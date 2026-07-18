/**
 * Human Centric Works — typographic wordmark (pure black by default).
 * Top line: Human Centric · bottom line: Works · equal total width via textLength.
 */
export function HcwWordmark({
  width = 280,
  className,
  title = "Human Centric Works",
  color = "#000000",
}: {
  width?: number;
  className?: string;
  title?: string;
  /** SVG fill — use currentColor in CSS-driven contexts (e.g. marketing rail). */
  color?: string;
}) {
  const lineWidth = 368;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 64"
      width={width}
      height={(width * 64) / 400}
      fill={color}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <text
        x="200"
        y="22"
        textAnchor="middle"
        fontFamily="'Urbanist', system-ui, -apple-system, sans-serif"
        fontSize="18"
        fontWeight="600"
        textLength={lineWidth}
        lengthAdjust="spacingAndGlyphs"
      >
        Human Centric
      </text>
      <text
        x="200"
        y="54"
        textAnchor="middle"
        fontFamily="'Urbanist', system-ui, -apple-system, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="0.06em"
        textLength={lineWidth}
        lengthAdjust="spacingAndGlyphs"
      >
        Works
      </text>
    </svg>
  );
}
