import { useEffect, type RefObject } from "react";

/** Close a floating panel when the user presses outside all ignored roots. */
export function useDismissOnOutsideClick(
  open: boolean,
  onClose: () => void,
  ignoreRefs: RefObject<HTMLElement | null>[],
): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ignoreRefs.some((ref) => ref.current?.contains(target))) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // ignoreRefs is a fresh array literal at most call sites; the refs inside it are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);
}
