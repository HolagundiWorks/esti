/**
 * Theme re-export shim — brand values live in `@hcw/ui-kit`.
 * Prefer `createHcwTheme` / `hcwTheme` in new code; AORMS aliases remain.
 */
export {
  createHcwTheme,
  hcwTheme,
  createAormsTheme,
  aormsTheme,
  aormsTheme as muiTheme,
  aormsTheme as default,
} from "@hcw/ui-kit";
