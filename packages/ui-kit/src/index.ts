/**
 * @esti/ui-kit — the centralised AORMS branding + UI kit.
 *
 * One import surface for every portal: design tokens, the shared MUI theme, the
 * MuiRoot provider, and brand primitives. Consuming portal:
 *
 *   import { MuiRoot, BrandMark } from "@esti/ui-kit";
 *   root.render(<MuiRoot><App /></MuiRoot>);
 */
export * from "./tokens.js";
export { createAormsTheme, aormsTheme } from "./theme.js";
export { MuiRoot } from "./MuiRoot.js";
export { BrandMark } from "./BrandMark.js";
