import "./styles.scss";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ToastHost } from "./components/ToastHost.js";
import { pushToast } from "./lib/toast.js";
import { trpc } from "./lib/trpc.js";

function toErrorToast(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  pushToast({ kind: "error", title: "Something went wrong", subtitle: message });
}

// App-wide error surfacing: every failed query/mutation raises a toast — no
// per-call wiring needed.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: toErrorToast }),
  mutationCache: new MutationCache({ onError: toErrorToast }),
});
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/trpc",
      // Attach a per-batch request ID so backend and worker logs can be
      // correlated to the originating SPA interaction (audit O3).
      headers: () => ({ "x-request-id": crypto.randomUUID() }),
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
            <App />
          </BrowserRouter>
          <ToastHost />
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
