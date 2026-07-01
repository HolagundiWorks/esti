import { apiKeysRouter } from "../modules/admin/apiKeys.js";
import { certificationsRouter } from "../modules/admin/certifications.js";
import { licensesRouter } from "../modules/admin/licenses.js";
import { orgsRouter } from "../modules/admin/orgs.js";
import { productsRouter } from "../modules/admin/products.js";
import { publicProcedure, router } from "./trpc.js";

/** Root tRPC router. The `admin` namespaces are platform-admin gated. */
export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ({ account: ctx.account })),
  }),
  admin: router({
    orgs: orgsRouter,
    products: productsRouter,
    licenses: licensesRouter,
    apiKeys: apiKeysRouter,
    certifications: certificationsRouter,
  }),
});

export type AppRouter = typeof appRouter;
