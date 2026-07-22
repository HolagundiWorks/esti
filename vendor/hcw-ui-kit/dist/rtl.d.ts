/**
 * Text direction + locale helpers for RTL-ready chrome (roadmap D15 kit half).
 * Product string catalogs / i18n frameworks remain consumer programmes.
 */
export type TextDirection = "ltr" | "rtl";
/** Default clock / date locale when a product does not inject one. */
export declare const DEFAULT_LOCALE = "en-IN";
/**
 * Options for Emotion `createCache` under RTL. Pass stylis plugins from the app:
 *
 *   import createCache from "@emotion/cache";
 *   import { CacheProvider } from "@emotion/react";
 *   import { prefixer } from "stylis";
 *   import rtlPlugin from "stylis-plugin-rtl";
 *   import { createHcwRtlCacheOptions, KitRoot } from "@hcw/ui-kit";
 *
 *   const cache = createCache(
 *     createHcwRtlCacheOptions("rtl", [prefixer, rtlPlugin]),
 *   );
 *   <CacheProvider value={cache}>
 *     <KitRoot direction="rtl" locale="ar">…</KitRoot>
 *   </CacheProvider>
 */
export declare function createHcwRtlCacheOptions(direction?: TextDirection, stylisPlugins?: unknown[]): {
    key: string;
    stylisPlugins?: unknown[];
};
//# sourceMappingURL=rtl.d.ts.map