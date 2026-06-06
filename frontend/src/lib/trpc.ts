import { createTRPCReact } from "@trpc/react-query";
// Type-only import of the backend router → end-to-end type safety (ADR-02).
import type { AppRouter } from "@esti/backend/router";

export const trpc = createTRPCReact<AppRouter>();
