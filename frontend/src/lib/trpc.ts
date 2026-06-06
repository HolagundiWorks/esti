import { type CreateTRPCReact, createTRPCReact } from "@trpc/react-query";
// Type-only import of the backend router → end-to-end type safety (ADR-02).
import type { AppRouter } from "@esti/backend/router";

// Explicit annotation avoids TS2742 (non-portable inferred type under declaration mode).
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
