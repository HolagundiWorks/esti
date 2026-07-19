/**
 * Live-database smoke test for ESTI AI agent (gateway + tRPC generate).
 *
 *   pnpm --filter @esti/backend exec tsx src/scripts/testAiAgent.ts
 *   podman exec esti-backend sh -c "cd /app/esti/backend && pnpm exec tsx src/scripts/testAiAgent.ts"
 */
import { parseAiSettings } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { runAiGateway } from "../lib/ai/gateway.js";
import { getOrgSettings } from "../lib/settings.js";
import { appRouter } from "../trpc/router.js";

let passed = 0;

function ok(label: string): void {
  passed += 1;
  console.log(`ok ${passed} — ${label}`);
}

function check(condition: boolean, label: string): void {
  if (!condition) {
    console.error(`FAIL — ${label}`);
    process.exit(1);
  }
  ok(label);
}

function callerFor(user: typeof users.$inferSelect) {
  return appRouter.createCaller({
    db,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      clientId: user.clientId,
      consultantId: user.consultantId,
      contractorId: user.contractorId,
      isDemo: user.isDemo ?? false,
      isSystemAdmin: user.isSystemAdmin ?? false,
      userCode: user.userCode ?? null,
      designation: user.designation ?? null,
      photoKey: user.photoKey ?? null,
    },
    ip: "127.0.0.1",
    requestId: "test-ai-agent",
    sessionToken: undefined,
    setCookie: () => undefined,
  });
}

async function main(): Promise<void> {
  const [demoUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "principal@demo.aorms.in"))
    .limit(1);
  check(!!demoUser, "demo principal user exists");

  const demoCaller = callerFor(demoUser!);
  const demoSettings = await demoCaller.ai.settings();
  check(demoSettings.agentEnabled === true, "demo ESTI agent enabled in ai.settings");
  check(demoSettings.draftsEnabled === false, "demo AI Studio drafts disabled");

  let draftBlocked = false;
  try {
    await demoCaller.ai.generate({ kind: "SUMMARY", prompt: "Write a project summary" });
  } catch (err) {
    draftBlocked =
      err instanceof TRPCError && err.code === "FORBIDDEN" && err.message.includes("demo account");
  }
  check(draftBlocked, "demo ai.generate drafts blocked");

  const demoAgent = await demoCaller.ai.generate({
    kind: "SUMMARY",
    mode: "agent",
    prompt: "What billing should I action on the dashboard?",
  });
  check(demoAgent.output.trim().length > 40, "demo ESTI agent returns an answer");
  check(demoAgent.provider === "ollama" || demoAgent.provider === "mock", "demo agent returns a provider");

  const org = await getOrgSettings(db);
  const settings = parseAiSettings(org.aiSettings);
  check(settings.enabled, "AI Studio enabled in org settings");

  const gateway = await runAiGateway(
    db,
    {
      id: demoUser!.id,
      role: demoUser!.role,
      email: demoUser!.email,
      fullName: demoUser!.fullName,
      isDemo: demoUser!.isDemo ?? false,
    },
    settings,
    { kind: "SUMMARY", mode: "agent", prompt: "List my open tasks" },
  );
  check(Array.isArray(gateway.sources), "gateway returns source refs");

  console.log(`\nAll ${passed} checks passed.`);
  console.log(`Sample demo agent output (${demoAgent.output.length} chars):`);
  console.log(demoAgent.output.slice(0, 280) + (demoAgent.output.length > 280 ? "…" : ""));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
