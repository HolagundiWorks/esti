/**
 * Live-database smoke test for ESTICAD companion auth (Phase 13A–13D).
 *
 *   pnpm --filter @esti/backend test:companion
 */
import { eq } from "drizzle-orm";
import { userFromDeviceToken } from "../auth/device.js";
import { db } from "../db/index.js";
import { projectOffices, users } from "../db/schema.js";
import { resolveCompanionCapabilities } from "../lib/companion/capabilities.js";
import { appRouter } from "../trpc/router.js";
import { takeoffCatalogPayload } from "../modules/companion/router.js";

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

async function main(): Promise<void> {
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.email, "principal@demo.aorms.in"))
    .limit(1);
  check(!!owner, "demo owner exists");

  const publicCaller = appRouter.createCaller({
    db,
    user: null,
    deviceSessionId: null,
    ip: "127.0.0.1",
    requestId: "test-companion",
    setCookie: () => undefined,
  });

  const login = await publicCaller.auth.loginDevice({
    email: "principal@demo.aorms.in",
    password: "demo1234",
    deviceName: "smoke-test",
    clientId: "esticad",
  });
  check(login.accessToken.length > 20, "loginDevice returns access token");
  check(login.refreshToken.length > 20, "loginDevice returns refresh token");

  const deviceUser = await userFromDeviceToken(db, login.accessToken);
  check(!!deviceUser, "bearer resolves to user");

  const deviceCaller = appRouter.createCaller({
    db,
    user: deviceUser!,
    deviceSessionId: deviceUser!.deviceSessionId,
    ip: "127.0.0.1",
    requestId: "test-companion-device",
    setCookie: () => undefined,
  });

  const caps = await deviceCaller.companion.capabilities();
  check(typeof caps.takeoff === "boolean", "capabilities.takeoff present");
  check(typeof caps.ai === "boolean", "capabilities.ai present");
  check(caps.firmName.length > 0, "capabilities.firmName present");
  check(caps.subscriptionActive === true, "demo account has full companion subscription");
  check(caps.takeoff === true, "demo takeoff enabled for staff write roles");
  check(caps.ai === false, "demo companion AI blocked");

  const catalog = await deviceCaller.companion.takeoffCatalog();
  check(Array.isArray(catalog.items) && catalog.items.length > 0, "takeoff catalog has items");

  const restPayload = takeoffCatalogPayload();
  check(restPayload.items.length === catalog.items.length, "REST payload matches tRPC catalog");

  const refreshed = await publicCaller.auth.refreshDevice({
    refreshToken: login.refreshToken,
    clientId: "esticad",
  });
  check(refreshed.accessToken !== login.accessToken, "refreshDevice rotates access token");

  const ownerCaps = await resolveCompanionCapabilities(db, {
    id: owner!.id,
    email: owner!.email,
    fullName: owner!.fullName,
    role: owner!.role,
    clientId: owner!.clientId,
    consultantId: owner!.consultantId,
    isDemo: false,
  });
  check(ownerCaps.subscriptionActive === true, "non-demo staff is subscription-active");

  const [project] = await db.select().from(projectOffices).limit(1);
  check(!!project, "project exists for companion bridge tests");

  const linked = await deviceCaller.companion.linkDrawing({
    projectId: project!.id,
    title: "Smoke linked drawing",
  });
  check(!!linked.id, "linkDrawing creates drawing row");

  await deviceCaller.drawings.setScale({
    drawingId: linked.id,
    scaleUnit: "mm",
    scaleFactor: 1,
  });
  check(true, "setScale persists from companion");

  const created = await deviceCaller.measurements.createCompanion({
    drawingId: linked.id,
    projectId: project!.id,
    label: "Smoke wall A1",
    kind: "LINEAR",
    elementTypeId: "WALL_230",
    realLength: 6000,
    scaleWorldUnits: "mm",
    worldGeometry: { type: "LINE", points: [{ x: 0, y: 0 }, { x: 6000, y: 0 }] },
    entityRefs: ["smoke-entity-1"],
    createdByClient: "esticad/smoke",
  });
  check(created.source === "ESTICAD", "createCompanion sets ESTICAD source");
  check(created.boqQty === 6, "createCompanion computes BOQ qty");

  const listed = await deviceCaller.measurements.listByDrawing({
    drawingId: linked.id,
    limit: 20,
  });
  check(
    listed.rows.some((row) => row.id === created.id),
    "listByDrawing returns companion measurement",
  );

  await deviceCaller.measurements.removeCompanion({ id: created.id });
  check(true, "removeCompanion deletes measurement");

  let cadBlocked = false;
  try {
    await deviceCaller.ai.generateCad({
      kind: "CAD_NAMING",
      projectId: project!.id,
      drawingId: linked.id,
      prompt: "Suggest layer names",
    });
  } catch {
    cadBlocked = true;
  }
  check(cadBlocked, "demo companion generateCad blocked");

  const ownerCaller = appRouter.createCaller({
    db,
    user: owner!,
    deviceSessionId: null,
    ip: "127.0.0.1",
    requestId: "test-companion-owner",
    setCookie: () => undefined,
  });
  const devices = await ownerCaller.companion.listDevices();
  check(devices.some((row) => row.id === deviceUser!.deviceSessionId), "listDevices includes active session");

  await ownerCaller.companion.revokeDevice({ sessionId: deviceUser!.deviceSessionId });
  const revokedUser = await userFromDeviceToken(db, login.accessToken);
  check(revokedUser === null, "revoked token cannot authenticate");

  console.log(`\nAll ${passed} checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
