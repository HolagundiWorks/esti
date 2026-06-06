import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In the pod the backend is reachable as http://backend:4000; locally it is
// http://localhost:4000. The browser always calls same-origin /trpc.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // File watching over the WSL/virtiofs bind is event-lossy; poll instead.
    watch: { usePolling: true },
    proxy: {
      "/trpc": { target: proxyTarget, changeOrigin: true },
    },
  },
});
