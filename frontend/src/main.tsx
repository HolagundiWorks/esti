// Brand font — Urbanist (OFL, self-hosted via @fontsource; works offline, no CDN).
import "@fontsource/urbanist/400.css";
import "@fontsource/urbanist/500.css";
import "@fontsource/urbanist/600.css";
import "@fontsource/urbanist/700.css";
import "./styles.scss";
import "./landing.scss";
import "./glass.scss";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { MuiRoot } from "./theme/MuiRoot.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ToastHost } from "./components/ToastHost.js";
import { pushToast } from "./lib/toast.js";
import { newRequestId } from "./lib/request-id.js";
import { apiUrl, authHeaders } from "./lib/api-base.js";
import { trpc } from "./lib/trpc.js";

function toErrorToast(error: unknown, meta?: { silent?: boolean }) {
  if (meta?.silent) return;
  const message = error instanceof Error ? error.message : "Unexpected error";
  pushToast({
    kind: "error",
    title: "Something went wrong",
    subtitle: message,
  });
}

// App-wide error surfacing: every failed query/mutation raises a toast — no
// per-call wiring needed. Background polls (e.g. alerts bell) set meta.silent.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => toErrorToast(error, query.meta as { silent?: boolean }),
  }),
  mutationCache: new MutationCache({ onError: (error) => toErrorToast(error) }),
});
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // Web: relative "/trpc" (same-origin). Desktop: absolute loopback base.
      url: apiUrl("/trpc"),
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
      // Per-batch request ID for backend↔worker log correlation (audit O3),
      // plus the desktop bearer token when running in the Tauri shell.
      headers: () => ({ "x-request-id": newRequestId(), ...authHeaders() }),
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <MuiRoot>
              <App />
            </MuiRoot>
          </BrowserRouter>
          <ToastHost />
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
