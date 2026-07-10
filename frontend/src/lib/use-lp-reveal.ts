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

    if (reduce) {
      for (const el of nodes) el.classList.add("lp2-reveal--in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("lp2-reveal--in");
          io.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    for (const el of nodes) io.observe(el);
    return () => io.disconnect();
  }, [rootSelector]);
}
