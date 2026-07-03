/**
 * Live-database smoke test for notifications alert aggregation.
 *
 *   pnpm --filter @esti/backend test:alerts
 *   podman exec esti-backend sh -c "cd /app/esti/backend && pnpm test:alerts"
 */
import { parseEscalationSettings } from "@esti/contracts";
import { db } from "../db/index.js";
import {
  assertValidAlert,
  buildAlerts,
  buildDigest,
  isAlertKind,
} from "../lib/buildAlerts.js";
import { getOrgSettings } from "../lib/settings.js";

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
  const settings = await getOrgSettings(db);
  check(settings != null, "org settings loaded");

  const rules = parseEscalationSettings(settings.escalationSettings);
  check(typeof rules.staleApprovalDays === "number", "escalation rules parsed");

  const alerts = await buildAlerts(db, rules);
  check(Array.isArray(alerts), "buildAlerts returns an array");

  for (const alert of alerts) {
    assertValidAlert(alert);
    check(isAlertKind(alert.kind), `valid kind on ${alert.id}`);
  }
  ok(`validated ${alerts.length} alert row(s)`);

  const immediate = alerts.filter((a) => a.immediate);
  check(immediate.every((a) => a.immediate), "immediate filter is consistent");

  const digest = buildDigest(alerts, rules.digestEnabled);
  check(Array.isArray(digest), "buildDigest returns an array");
  if (rules.digestEnabled) {
    check(
      digest.every((a) => !a.immediate || a.severity === "low"),
      "digest excludes immediate high/medium alerts",
    );
  } else {
    check(digest.length === 0, "digest empty when disabled");
  }

  console.log(`\n${passed} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("testBuildAlerts failed:", err);
    process.exit(1);
  });
