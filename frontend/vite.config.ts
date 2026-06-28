import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:4000";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const estiRoot = path.resolve(frontendDir, "..");
const vendorDir = path.resolve(estiRoot, "vendor");

// In Docker and self-contained builds the kits are vendored under vendor/.
// vendor/ is also committed to the repo so dev builds use the same paths.
// Falls back to the parent directory only when vendor/ is absent (rare).
function kitFile(pkg: string, file: string) {
  const vendorPath = path.resolve(vendorDir, pkg, file);
  if (fs.existsSync(vendorPath)) return vendorPath;
  return path.resolve(estiRoot, "..", pkg, file);
}

export default defineConfig({
  root: frontendDir,
  plugins: [react()],
  // Several bundled packages (Carbon, react-responsive-masonry, etc.) read
  // process.env.NODE_ENV at runtime; define it so the browser bundle sees it.
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Sass 1.77+ logs legacy-js-api deprecation warnings for packages
        // (like @carbon/react) that haven't fully migrated to the modern API.
        // Silence them so they don't become build errors in strict mode.
        silenceDeprecations: ["legacy-js-api"],
        quietDeps: true,
      },
    },
  },
  resolve: {
    alias: [
      // The vendored Rate Book kit imports "zod", but its dist files live
      // under vendor/ — outside frontend/ — so Rollup can't resolve "zod" from that
      // location. Pin every "zod" import to the frontend's installed copy.
      // zod is not a direct frontend dep, so it isn't symlinked into
      // frontend/node_modules; resolve it via @esti/contracts (which depends on it).
      {
        find: /^zod$/,
        replacement: createRequire(path.join(estiRoot, "packages/contracts/package.json")).resolve("zod"),
      },
      {
        find: "@hcw/master-dsr-kit/schemas",
        replacement: kitFile("hcw-master-dsr-kit", "dist/schemas/dsr-import.js"),
      },
      {
        find: "@hcw/master-dsr-kit/catalog",
        replacement: kitFile("hcw-master-dsr-kit", "dist/catalog/index.js"),
      },
      {
        find: "@hcw/master-dsr-kit",
        replacement: kitFile("hcw-master-dsr-kit", "dist/index.js"),
      },
    ],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split the heavy libraries into their own cacheable chunks. charts and xlsx
        // are only reached from lazy (authenticated) routes, so they stay off the
        // landing's critical path; carbon (the design system) is one shared chunk.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@carbon/charts")) return "vendor-charts";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("@carbon")) return "vendor-carbon";
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: { usePolling: true },
    fs: {
      // vendor/ is inside estiRoot — no need to allow the parent directory.
      allow: [estiRoot],
    },
    proxy: {
      "/trpc": { target: proxyTarget, changeOrigin: true },
      "/upload": { target: proxyTarget, changeOrigin: true },
      "/calendar": { target: proxyTarget, changeOrigin: true },
      "/health": { target: proxyTarget, changeOrigin: true },
      "/api": { target: proxyTarget, changeOrigin: true },
    },
  },
});
