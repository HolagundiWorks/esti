import { ArrowRight } from "@carbon/icons-react";
import { Link, Stack, Tag } from "@carbon/react";
import type { ElementType, ReactNode } from "react";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";

/**
 * IBM.com feature / topic card — icon, title, body, optional CTA.
 */
export function LandingFeatureCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  tag,
  metric,
  metricLabel,
  highlights,
  primaryAction,
  linkHref,
  linkLabel,
  children,
}: {
  icon?: ElementType;
  eyebrow?: string;
  title: string;
  body: string;
  tag?: string;
  metric?: string;
  metricLabel?: string;
  highlights?: string[];
  primaryAction?: ReactNode;
  linkHref?: string;
  linkLabel?: string;
  children?: ReactNode;
}) {
  const footer =
    primaryAction || (linkHref && linkLabel) ?
      <>
        {primaryAction}
        {linkHref && linkLabel ?
          <Link href={linkHref} renderIcon={ArrowRight}>
            {linkLabel}
          </Link>
        : null}
      </>
    : undefined;

  return (
    <MarketingFeatureTile footer={footer}>
      {eyebrow ? <p className="esti-landing-eyebrow">{eyebrow}</p> : null}
      {Icon ?
        <Icon size={32} aria-hidden className="esti-landing-feature-tile__icon" />
      : null}
      {metric ?
        <Stack gap={1}>
          <p className="esti-landing-feature-tile__metric">{metric}</p>
          {metricLabel ?
            <p className="esti-landing-feature-tile__metric-label">{metricLabel}</p>
          : null}
        </Stack>
      : null}
      <div className="esti-row">
        <h3 className="esti-landing-section-title">{title}</h3>
        {tag ?
          <Tag type="blue" size="sm">
            {tag}
          </Tag>
        : null}
      </div>
      <p>{body}</p>
      {highlights && highlights.length > 0 ?
        <Stack gap={4}>
          {highlights.map((h) => (
            <p key={h} className="esti-label esti-label--secondary">
              {h}
            </p>
          ))}
        </Stack>
      : null}
      {children}
    </MarketingFeatureTile>
  );
}

/**
 * Primary CTA strip — IBM.com closing band pattern.
 */
export function LandingCtaStrip({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={5} className="esti-landing-cta-strip">
      <Stack gap={3}>
        <h2 className="esti-landing-section-title">{title}</h2>
        <p className="esti-landing-section-lead">{lead}</p>
      </Stack>
      {children}
    </Stack>
  );
}
