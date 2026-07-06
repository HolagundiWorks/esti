import ArrowForward from "@mui/icons-material/ArrowForward";
import Check from "@mui/icons-material/Check";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { PLAN_LABEL } from "@esti/contracts";
import { Link as RouterLink } from "react-router-dom";
import { useEdition } from "../../lib/edition.js";
import { trpc } from "../../lib/trpc.js";

const tagSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color})`,
  color: `var(--cds-tag-color-${color})`,
});

/**
 * Guided Lite → Pro upgrade. Reads the workspace's own licence (not the
 * platform account), so it always shows the real current plan and the path
 * forward. Material UI.
 */
export function UpgradeToPro() {
  const licenseQ = trpc.license.status.useQuery();
  const runtimeQ = trpc.auth.runtime.useQuery();
  const { community } = useEdition();

  if (community) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h6" component="h3">Upgrade to AORMS Pro</Typography>
          <Typography variant="body2" color="text.secondary">
            You&apos;re on the free Community edition — offline, on your own network. AORMS Pro adds
            the cloud workspace, external portals, AI and more. To move up: package your whole
            company in <strong>Company › Move to AORMS Pro</strong>, then import the bundle into your
            new Pro workspace. Migration is one-way.
          </Typography>
        </Stack>
      </Box>
    );
  }

  const view = licenseQ.data;
  if (!view) return null;

  const isPro = view.plan === "PRO" && (view.status === "VALID" || view.status === "GRACE");
  const desktop = runtimeQ.data?.desktop ?? false;

  if (isPro) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Check fontSize="small" />
          <Typography variant="body2" sx={{ flex: 1 }}>
            You&apos;re on <strong>{PLAN_LABEL[view.plan]}</strong> — the full edition is unlocked.
          </Typography>
          <Chip size="small" label={PLAN_LABEL[view.plan]} sx={tagSx("green")} />
        </Stack>
      </Box>
    );
  }

  const steps: { n: string; text: string; action?: ReactNode }[] = [
    { n: "1", text: "Request Pro from your AORMS account below — we email your licence once approved." },
    {
      n: "2",
      text: "Activate the emailed key.",
      action: (
        <Button component={RouterLink} to="/company" variant="text" size="small" endIcon={<ArrowForward />}>
          Company · Licence
        </Button>
      ),
    },
    { n: "3", text: "You're on Pro — the full edition unlocks instantly, no reinstall." },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="h6" component="h3" sx={{ flex: 1 }}>Upgrade to Pro</Typography>
          <Chip size="small" label={PLAN_LABEL[view.plan]} sx={tagSx("cool-gray")} />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {desktop
            ? "Pro lifts the seat limits and unlocks the full edition. Your studio stays on this computer — when you're ready, Pro also lets you move it to the cloud."
            : "Pro lifts the seat limits and unlocks the full edition across your workspace."}
        </Typography>

        <Stack spacing={1.5}>
          {steps.map((s) => (
            <Stack key={s.n} direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip size="small" label={s.n} sx={tagSx("teal")} />
              <Typography variant="body2" sx={{ flex: 1 }}>{s.text}</Typography>
              {s.action}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
