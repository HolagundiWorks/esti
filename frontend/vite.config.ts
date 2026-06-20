import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

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
      {
        find: "@hcw/india-compliance-kit/profiles/bbmp-2003",
        replacement: kitFile("hcw-india-compliance-kit", "dist/profiles/bbmp-2003/index.js"),
      },
      {
        find: "@hcw/india-compliance-kit",
        replacement: kitFile("hcw-india-compliance-kit", "dist/index.js"),
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
    },
  },
});
