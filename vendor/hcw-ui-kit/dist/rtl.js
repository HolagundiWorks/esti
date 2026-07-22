/** Default clock / date locale when a product does not inject one. */
export const DEFAULT_LOCALE = "en-IN";
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
export function createHcwRtlCacheOptions(direction = "rtl", stylisPlugins) {
    if (direction !== "rtl")
        return { key: "hcw-ltr" };
    return {
        key: "hcw-rtl",
        ...(stylisPlugins ? { stylisPlugins } : {}),
    };
}
//# sourceMappingURL=rtl.js.map