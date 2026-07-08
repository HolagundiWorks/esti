/**
 * The AORMS MUI theme now lives in the centralised branding kit so every portal
 * shares one source of truth. This local path is kept as a stable re-export.
 * Edit brand values in `packages/ui-kit` (tokens.ts / theme.ts), not here.
 */
export { aormsTheme as muiTheme, createAormsTheme } from "@hcw/ui-kit";
export { aormsTheme as default } from "@hcw/ui-kit";
