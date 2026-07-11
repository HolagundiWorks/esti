import { HUMAN_CENTRIC_WORKS } from "../../lib/product-nomenclature.js";

type Variant = "rail" | "footer" | "inline" | "auth";
type LogoTone = "on-dark" | "on-light";

const LOGO_HEIGHT: Record<Variant, number> = {
  rail: 14,
  footer: 30,
  inline: 22,
  auth: 20,
};

const DEFAULT_TONE: Record<Variant, LogoTone> = {
  rail: "on-light",
  footer: "on-dark",
  inline: "on-light",
  auth: "on-dark",
};

/** Human Centric Works logo + optional design credit. */
export function HcwAttribution({
  variant = "inline",
  showNote = true,
  logoTone,
  compact = false,
  className,
}: {
  variant?: Variant;
  showNote?: boolean;
  /** Logo variant — defaults from surface (black on light rail, white on orange footer). */
  logoTone?: LogoTone;
  /** Smaller logo (e.g. collapsed marketing rail). */
  compact?: boolean;
  className?: string;
}) {
  const tone = logoTone ?? DEFAULT_TONE[variant];
  const logoSrc =
    tone === "on-dark"
      ? HUMAN_CENTRIC_WORKS.logoOnDark
      : HUMAN_CENTRIC_WORKS.logoOnLight;
  const height = compact ? Math.round(LOGO_HEIGHT[variant] * 0.86) : LOGO_HEIGHT[variant];
  const rootClass = [
    "hcw-attribution",
    `hcw-attribution--${variant}`,
    variant === "rail" ? "lp2-rail__hcw" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <a
        href="/about"
        className="hcw-attribution__link"
        aria-label={`${HUMAN_CENTRIC_WORKS.legalName} — About`}
      >
        <img
          src={logoSrc}
          alt={HUMAN_CENTRIC_WORKS.legalName}
          className="hcw-attribution__mark"
          height={height}
          loading="lazy"
          decoding="async"
        />
      </a>
      {showNote ? (
        <p className="hcw-attribution__note">{HUMAN_CENTRIC_WORKS.attribution}</p>
      ) : null}
    </div>
  );
}
