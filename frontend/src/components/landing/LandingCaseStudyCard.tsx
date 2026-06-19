import { ArrowRight } from "@carbon/icons-react";
import {
  Button,
  ContainedList,
  ContainedListItem,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
} from "@carbon/react";
import type { ElementType, ReactNode } from "react";

export type CaseStudyHighlight = {
  label: string;
  hint: string;
};

/**
 * IBM.com-style case study card — animated border on hover/focus, solid when reduced motion.
 */
export function LandingCaseStudyCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  metric,
  metricLabel,
  highlights,
  tour,
  tag,
  ctaLabel,
  onCta,
  ctaIcon: CtaIcon,
  loading = false,
  disabled = false,
  footer,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
  highlights: string[];
  tour?: CaseStudyHighlight[];
  tag?: string;
  ctaLabel: string;
  onCta: () => void;
  ctaIcon?: ElementType;
  loading?: boolean;
  disabled?: boolean;
  footer?: ReactNode;
}) {
  return (
    <article className="esti-case-study-card">
      <div className="esti-case-study-card__glow" aria-hidden />
      <div className="esti-case-study-card__inner">
        <Stack gap={6}>
          <div className="esti-case-study-card__hero">
            <Icon size={32} aria-hidden className="esti-case-study-card__icon" />
            <Stack gap={1}>
              <p className="esti-case-study-card__metric">{metric}</p>
              <p className="esti-case-study-card__metric-label">{metricLabel}</p>
            </Stack>
          </div>

          <Stack gap={4}>
            <p className="esti-landing-eyebrow">{eyebrow}</p>
            <Stack orientation="horizontal" gap={3}>
              <h3 className="esti-case-study-card__title">{title}</h3>
              {tag && (
                <Tag type="teal" size="sm">
                  {tag}
                </Tag>
              )}
            </Stack>
            <p>{body}</p>
          </Stack>

          <StructuredListWrapper aria-label={`${title} highlights`}>
            <StructuredListBody>
              {highlights.map((h) => (
                <StructuredListRow key={h}>
                  <StructuredListCell>{h}</StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>

          {tour && tour.length > 0 && (
            <ContainedList label="Where to look first" kind="on-page" size="sm">
              {tour.map((t) => (
                <ContainedListItem key={t.label}>
                  <Stack gap={2}>
                    <p>{t.label}</p>
                    <p>{t.hint}</p>
                  </Stack>
                </ContainedListItem>
              ))}
            </ContainedList>
          )}

          <Button
            kind="primary"
            size="lg"
            renderIcon={CtaIcon ?? ArrowRight}
            onClick={onCta}
            disabled={disabled}
          >
            {loading ? "Opening…" : ctaLabel}
          </Button>

          {footer}
        </Stack>
      </div>
    </article>
  );
}
