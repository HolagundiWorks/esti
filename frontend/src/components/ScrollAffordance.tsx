import { ChevronDown, ChevronUp } from "@carbon/icons-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type ScrollAffordanceProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Scrollable region with hidden scrollbars and up/down chevrons when more
 * content exists above or below the visible area.
 */
export function ScrollAffordance({ children, className }: ScrollAffordanceProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const update = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 2);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  const rootClass = className
    ? `esti-scroll-affordance ${className}`
    : "esti-scroll-affordance";

  return (
    <div className={rootClass}>
      {canScrollUp && (
        <div className="esti-scroll-affordance__hint esti-scroll-affordance__hint--up" aria-hidden>
          <ChevronUp size={16} />
        </div>
      )}
      <div ref={viewportRef} className="esti-scroll-affordance__viewport">
        {children}
      </div>
      {canScrollDown && (
        <div className="esti-scroll-affordance__hint esti-scroll-affordance__hint--down" aria-hidden>
          <ChevronDown size={16} />
        </div>
      )}
    </div>
  );
}
