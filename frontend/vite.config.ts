import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:4000";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const estiRoot = path.resolve(frontendDir, "..");

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
      // Vendored workspace kits import "zod" but their dist files live under
      // vendor/ — outside frontend/ — so Rollup can't resolve "zod" from that
      // location. zod is not a direct frontend dep, so it isn't symlinked into
      // frontend/node_modules; resolve every "zod" import via @esti/contracts.
      {
        find: /^zod$/,
        replacement: createRequire(path.join(estiRoot, "packages/contracts/package.json")).resolve("zod"),
      },
    ],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // Two entries from one build: the product SPA (index.html) and the
      // standalone licensing console (admin.html — served at admin.DOMAIN by
      // deploy/install-admin-console.sh, which points its vhost index at it).
      input: {
        main: path.join(frontendDir, "index.html"),
        admin: path.join(frontendDir, "admin.html"),
      },
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
    // Container-based tooling (Playwright in a docker network for visual
    // regression) reaches the dev server by hostname; allow it past Vite's
    // DNS-rebinding host check. Harmless for normal localhost/LAN dev.
    allowedHosts: ["host.docker.internal"],
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
      // Licensing platform backend mount (/platform/auth, /platform/onboard,
      // /platform/trpc, /platform/v1). The trailing slash is required: a bare
      // "/platform" would also capture the SPA route "/platform-admin" and proxy
      // it to the backend (404). Mirrors prod nginx `location /platform/`.
      "/platform/": { target: proxyTarget, changeOrigin: true },
    },
  },
});
