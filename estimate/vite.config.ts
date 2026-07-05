import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [react()],
  // Relative base so the built app works from a file:// path inside the Tauri shell.
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
