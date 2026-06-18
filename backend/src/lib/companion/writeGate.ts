import { TRPCError } from "@trpc/server";
import type { AuthUser } from "../../auth/session.js";
import type { Context } from "../../trpc/context.js";
import { resolveCompanionCapabilities } from "./capabilities.js";

export async function assertCompanionTakeoff(ctx: Pick<Context, "db" | "user">): Promise<void> {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const caps = await resolveCompanionCapabilities(ctx.db, ctx.user);
  if (!caps.takeoff) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Companion takeoff is not licensed for this account.",
    });
  }
}

export function companionClientLabel(_user: AuthUser, override?: string): string {
  return override ?? "esticad/unknown";
}
