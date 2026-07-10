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

/** Logo + optional tagline for auth rail headers. */
export function AuthBrandBlock({ tagline }: { tagline?: string }) {
  return (
    <div className="esti-login-brand esti-login-brand--stacked">
      <AormsLogo variant="rail" />
      {tagline ? (
        <p className="esti-label esti-label--secondary">{tagline}</p>
      ) : null}
    </div>
  );
}
