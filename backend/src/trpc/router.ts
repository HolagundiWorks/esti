import { GST_RATES, SAC_CODES } from "@esti/contracts";
import { authRouter } from "../modules/auth/router.js";
import { projectOfficeRouter } from "../modules/projectoffice/router.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, service: "esti-aorms-backend", ts: Date.now() })),

  /** Fixed India profile surfaced to the SPA (read-only). */
  profile: publicProcedure.query(() => ({
    currency: "INR" as const,
    financialYearStart: "04-01",
    gstRates: GST_RATES,
    sacCodes: SAC_CODES,
  })),

  auth: authRouter,
  projectOffice: projectOfficeRouter,
});

/** Exported type only — the SPA imports this for end-to-end type safety. */
export type AppRouter = typeof appRouter;
