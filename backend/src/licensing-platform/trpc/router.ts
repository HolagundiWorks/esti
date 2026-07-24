import { accountsRouter } from "../modules/admin/accounts.js";
import { apiKeysRouter } from "../modules/admin/apiKeys.js";
import { certificationsRouter } from "../modules/admin/certifications.js";
import { componentsRouter } from "../modules/admin/components.js";
import { dashboardRouter } from "../modules/admin/dashboard.js";
import { licensesRouter } from "../modules/admin/licenses.js";
import { orgsRouter } from "../modules/admin/orgs.js";
import { productsRouter } from "../modules/admin/products.js";
import { requestsRouter } from "../modules/admin/requests.js";
import { usageReportsRouter } from "../modules/admin/usageReportsAdmin.js";
import { publicProcedure, router } from "./trpc.js";

/** Root tRPC router. The `admin` namespaces are platform-admin gated. */
export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ({ account: ctx.account })),
  }),
  admin: router({
    dashboard: dashboardRouter,
    accounts: accountsRouter,
    orgs: orgsRouter,
    products: productsRouter,
    licenses: licensesRouter,
    apiKeys: apiKeysRouter,
    certifications: certificationsRouter,
    requests: requestsRouter,
    components: componentsRouter,
    usageReports: usageReportsRouter,
  }),
});

export type AppRouter = typeof appRouter;
