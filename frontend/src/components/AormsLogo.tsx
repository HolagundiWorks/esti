/** AORMS wordmark — CSS-mask logo (`/aorms-logo.png`, Radiant Orange fill). */
export function AormsLogo({
  variant = "md",
  className,
}: {
  /** `rail` auth rail · `stage` auth canvas · `hero` marketing hero · `watermark` app corner · `md` default */
  variant?: "sm" | "md" | "rail" | "stage" | "hero" | "watermark";
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="AORMS"
      className={[
        "esti-brand",
        "esti-brand--aorms",
        `esti-aorms-logo--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/** Isolated lowercase **a** from the AORMS typography logo — square mark for favicon, rail collapse, BrandMark accent. */
export function AormsMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "rail" | "stage" | "hero" | "watermark";
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="AORMS"
      className={[
        "esti-brand",
        "esti-brand--aorms-mark",
        `esti-aorms-mark--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/** Logo + optional tagline for auth rail headers. */
export function AuthBrandBlock({ tagline }: { tagline?: string }) {
  return (
    <div className="esti-login-brand esti-login-brand--stacked">
      <a href="/#top" className="esti-login-brand__link" aria-label="AORMS home">
        <AormsLogo variant="rail" />
      </a>
      {tagline ? (
        <p className="esti-label esti-label--secondary">{tagline}</p>
      ) : null}
    </div>
  );
}
