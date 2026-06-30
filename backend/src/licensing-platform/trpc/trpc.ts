import "@fastify/cookie"; // loads the unsignCookie type augmentation
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { readSession } from "../lib/session.js";
import { getAccountById, type AccountView } from "../modules/auth/service.js";

export interface Context {
  account: AccountView | null;
}

export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
  const session = readSession(req);
  const account = session ? await getAccountById(session.accountId) : null;
  return { account };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires a signed-in account. */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.account) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { account: ctx.account } });
});

/** Requires a platform admin (Holagundi staff). */
export const platformAdminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!ctx.account.isPlatformAdmin) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});
