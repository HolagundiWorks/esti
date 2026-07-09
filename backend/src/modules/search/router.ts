import { SearchQueryInput } from "@esti/contracts";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { runUniversalSearch } from "./query.js";

export const searchRouter = router({
  query: protectedProcedure.input(SearchQueryInput).query(async ({ ctx, input }) => {
    return runUniversalSearch(ctx.db, ctx.user.role, input);
  }),
});
