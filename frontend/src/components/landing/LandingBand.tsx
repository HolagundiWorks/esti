import type { ReactNode } from "react";

type BandVariant = "default" | "lead" | "muted" | "contrast";

/**
 * Full-bleed page band — mirrors IBM.com editorial sections (alternating backgrounds).
 */
export function LandingBand({
  children,
  variant = "default",
  id,
  ariaLabelledby,
  className,
}: {
  children: ReactNode;
  variant?: BandVariant;
  id?: string;
  ariaLabelledby?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={[
        "esti-landing-band",
        variant !== "default" && `esti-landing-band--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={ariaLabelledby}
    >
      {children}
    </section>
  );
}

/**
 * Centered editorial max-width — Carbon for IBM.com editorial style model.
 */
export function LandingEditorial({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["esti-landing-editorial", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
