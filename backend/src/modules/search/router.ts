import { SearchQueryInput } from "@esti/contracts";
import { z } from "zod";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { runKnowledgeBankSearch, runUniversalSearch } from "./query.js";

export const searchRouter = router({
  query: protectedProcedure.input(SearchQueryInput).query(async ({ ctx, input }) => {
    return runUniversalSearch(ctx.db, ctx.user.role, input);
  }),

  knowledgeBank: protectedProcedure
    .input(
      z.object({
        q: z.string().trim().min(2).max(200),
        limit: z.number().int().min(1).max(50).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const hits = await runKnowledgeBankSearch(ctx.db, ctx.user.role, input);
      return { hits };
    }),
});
