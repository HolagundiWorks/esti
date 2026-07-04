import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Stack, Tag, Tile } from "@carbon/react";
import { PLAN_LABEL } from "@esti/contracts";
import { Link as RouterLink } from "react-router-dom";
import { trpc } from "../../lib/trpc.js";

/**
 * Guided Lite → Pro upgrade. Reads the workspace's own licence (not the
 * platform account), so it always shows the real current plan and the path
 * forward: request Pro from the AORMS account, then activate the emailed key.
 * On a local-first desktop install it reassures that data stays on the machine.
 */
export function UpgradeToPro() {
  const licenseQ = trpc.license.status.useQuery();
  const runtimeQ = trpc.auth.runtime.useQuery();

  const view = licenseQ.data;
  if (!view) return null;

  const isPro = view.plan === "PRO" && (view.status === "VALID" || view.status === "GRACE");
  const desktop = runtimeQ.data?.desktop ?? false;

  if (isPro) {
    return (
      <Tile>
        <Stack orientation="horizontal" gap={3}>
          <Checkmark size={20} />
          <span className="esti-grow">
            You&apos;re on <strong>{PLAN_LABEL[view.plan]}</strong> — the full edition is unlocked.
          </span>
          <Tag type="green">{PLAN_LABEL[view.plan]}</Tag>
        </Stack>
      </Tile>
    );
  }

  const steps: { n: string; text: string; action?: React.ReactNode }[] = [
    { n: "1", text: "Request Pro from your AORMS account below — we email your licence once approved." },
    {
      n: "2",
      text: "Activate the emailed key.",
      action: (
        <Button as={RouterLink} to="/company" kind="ghost" size="sm" renderIcon={ArrowRight}>
          Company · Licence
        </Button>
      ),
    },
    { n: "3", text: "You're on Pro — the full edition unlocks instantly, no reinstall." },
  ];

  return (
    <Tile>
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={3}>
          <h3 className="esti-label esti-grow">Upgrade to Pro</h3>
          <Tag type="cool-gray">{PLAN_LABEL[view.plan]}</Tag>
        </Stack>

        <p className="esti-label esti-label--secondary">
          {desktop
            ? "Pro lifts the seat limits and unlocks the full edition. Your studio stays on this computer — when you're ready, Pro also lets you move it to the cloud."
            : "Pro lifts the seat limits and unlocks the full edition across your workspace."}
        </p>

        <Stack gap={4}>
          {steps.map((s) => (
            <Stack key={s.n} orientation="horizontal" gap={3}>
              <Tag type="teal" size="sm">
                {s.n}
              </Tag>
              <span className="esti-grow">{s.text}</span>
              {s.action}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Tile>
  );
}
