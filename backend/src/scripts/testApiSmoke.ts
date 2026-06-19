/**
 * Live-database smoke test for cursor-paginated project lists (Phase 12).
 *
 *   pnpm --filter @esti/backend test:api-smoke
 */
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectOffices, users } from "../db/schema.js";
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

async function assertCursorList(
  label: string,
  fetch: (cursor?: { createdAt: string; id: string }) => Promise<{ rows: unknown[]; nextCursor: { createdAt: string; id: string } | null }>,
): Promise<void> {
  const first = await fetch();
  check(Array.isArray(first.rows), `${label} returns rows array`);
  check(
    first.nextCursor === null || typeof first.nextCursor.createdAt === "string",
    `${label} nextCursor shape`,
  );
  if (first.nextCursor) {
    const second = await fetch(first.nextCursor);
    check(Array.isArray(second.rows), `${label} second page returns rows`);
  }
}

async function main(): Promise<void> {
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.email, "principal@demo.aorms.in"))
    .limit(1);
  check(!!owner, "demo owner exists");

  const [project] = await db.select().from(projectOffices).limit(1);
  check(!!project, "at least one project exists");

  const caller = appRouter.createCaller({
    db,
    user: owner!,
    deviceSessionId: null,
    ip: "127.0.0.1",
    requestId: "test-api-smoke",
    sessionToken: undefined,
    setCookie: () => undefined,
  });

  const projectId = project!.id;

  await assertCursorList("approvals.listByProject", (cursor) =>
    caller.approvals.listByProject({ projectId, limit: 5, cursor }),
  );
  await assertCursorList("criticalNotes.listByProject", (cursor) =>
    caller.criticalNotes.listByProject({ projectId, limit: 5, cursor }),
  );
  await assertCursorList("engagements.listByProject", (cursor) =>
    caller.engagements.listByProject({ projectId, limit: 5, cursor }),
  );
  await assertCursorList("decisions.listByProject", (cursor) =>
    caller.decisions.listByProject({ projectId, limit: 5, cursor }),
  );

  console.log(`\nAll ${passed} checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
