import { useEffect } from "react";

/**
 * Scroll-reveal for marketing sections — adds `.lp2-reveal--in` when elements
 * enter the viewport. Respects `prefers-reduced-motion`.
 */
export function useLpReveal(rootSelector = ".lp2-shell"): void {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".lp2-reveal"));

    const reveal = (el: HTMLElement) => {
      el.classList.add("lp2-reveal--in");
    };

    if (reduce) {
      for (const el of nodes) reveal(el);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          io.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );

    for (const el of nodes) {
      // Above-the-fold blocks may already be visible before the first IO tick.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        reveal(el);
      } else {
        io.observe(el);
      }
    }
    return () => io.disconnect();
  }, [rootSelector]);
}
