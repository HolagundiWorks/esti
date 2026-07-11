/**
 * Toast store — promoted into the design system (2026-07). Compatibility
 * re-export so existing call sites keep their import path; new code should
 * import from `@hcw/ui-kit` directly.
 */
export { pushToast, dismissToast, useToasts } from "@hcw/ui-kit";
export type { Toast, ToastKind } from "@hcw/ui-kit";
