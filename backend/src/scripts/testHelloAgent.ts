import { parseAiSettings } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { runAiGateway } from "../lib/ai/gateway.js";
import { getOrgSettings } from "../lib/settings.js";

const [user] = await db.select().from(users).where(eq(users.email, "principal@demo.aorms.in")).limit(1);
if (!user) throw new Error("demo user missing");

const org = await getOrgSettings(db);
const settings = parseAiSettings(org.aiSettings);

for (const spec of [
  { label: "agent hello", input: { kind: "SUMMARY" as const, mode: "agent" as const, prompt: "hello" } },
  { label: "draft hello", input: { kind: "SUMMARY" as const, prompt: "hello" } },
  { label: "draft no prompt", input: { kind: "SUMMARY" as const } },
] as const) {
  const r = await runAiGateway(db, user, settings, spec.input);
  const isTemplate = r.output.includes("# Project summary (draft)");
  console.log(`\n--- ${spec.label} ---`);
  console.log(`provider=${r.provider} template=${isTemplate}`);
  console.log(r.output.slice(0, 280));
}
