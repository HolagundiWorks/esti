import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// In the pod the backend is reachable as http://backend:4000; locally it is
// http://localhost:4000. The browser always calls same-origin /trpc.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:4000";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const estiRoot = path.resolve(frontendDir, "..");
const reposRoot = path.resolve(estiRoot, "..");

function kitFile(pkg: string, file: string) {
  return path.resolve(reposRoot, pkg, file);
}

export default defineConfig({
  plugins: [react()],
  // Some CJS deps (e.g. react-grid-layout) read process.env.NODE_ENV at
  // runtime; the browser has no `process`, so define it at build time.
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
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
    // File watching over the WSL/virtiofs bind is event-lossy; poll instead.
    watch: { usePolling: true },
    fs: {
      allow: [estiRoot, reposRoot],
    },
    proxy: {
      "/trpc": { target: proxyTarget, changeOrigin: true },
      // Binary upload endpoints (logo, drawings, reconcile) live outside tRPC.
      "/upload": { target: proxyTarget, changeOrigin: true },
      "/calendar": { target: proxyTarget, changeOrigin: true },
      "/health": { target: proxyTarget, changeOrigin: true },
    },
  },
});
