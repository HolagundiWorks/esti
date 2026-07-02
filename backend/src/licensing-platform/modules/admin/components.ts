import { ManifestComponent, Plan } from "@esti/contracts";
import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import { listComponentReleases, publishComponentRelease } from "../components/service.js";

/**
 * Desktop component releases — the artifact sets the Manager downloads per
 * edition. Normally published by the build pipeline (via an org-scoped product
 * key against a machine endpoint later), but a platform admin can publish/list
 * here too.
 */
export const componentsRouter = router({
  list: platformAdminProcedure.query(() => listComponentReleases()),

  publish: platformAdminProcedure
    .input(
      z.object({
        edition: Plan,
        appVersion: z.string().min(1),
        components: z.array(ManifestComponent),
      }),
    )
    .mutation(async ({ input }) => publishComponentRelease(input)),
});
