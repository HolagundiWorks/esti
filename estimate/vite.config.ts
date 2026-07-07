import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

// The native C++ desktop host loads the UI via webview `set_html`, so it needs a
// single self-contained index.html. Set ESTI_SINGLEFILE=1 to inline JS/CSS via
// vite-plugin-singlefile (a devDependency). The plugin is loaded optionally so a
// plain `pnpm build` still works when it isn't installed.
const plugins = [react()];
if (process.env.ESTI_SINGLEFILE) {
  try {
    const { viteSingleFile } = require("vite-plugin-singlefile");
    plugins.push(viteSingleFile());
  } catch {
    console.warn("ESTI_SINGLEFILE set but vite-plugin-singlefile is not installed — building multi-file");
  }
}

export default defineConfig({
  plugins,
  // Relative base so the built app works from a file:// path or set_html.
  base: "./",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  css: {
    preprocessorOptions: {
      scss: { silenceDeprecations: ["legacy-js-api"], quietDeps: true },
    },
  },
  resolve: {
    alias: [
      // @esti/contracts bundles zod; resolve every "zod" import to the single
      // copy it ships with, so the app never double-bundles zod.
      { find: /^zod$/, replacement: require.resolve("zod") },
    ],
  },
  build: { outDir: "dist", emptyOutDir: true },
});
