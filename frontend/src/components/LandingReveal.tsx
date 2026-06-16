/**
 * Scroll-triggered fade-up reveal for landing sections (Apple-style storytelling).
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function LandingReveal({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const style: CSSProperties | undefined = delay
    ? { ["--esti-lp-reveal-delay" as string]: `${delay}ms` }
    : undefined;

  return (
    <div
      ref={ref}
      className={["esti-lp-reveal", visible && "esti-lp-reveal--in", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
