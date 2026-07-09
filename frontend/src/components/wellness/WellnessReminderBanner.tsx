import Close from "@mui/icons-material/Close";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import RemoveRedEye from "@mui/icons-material/RemoveRedEye";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  openWellness,
  WELLNESS_REMINDER_EVENT,
  type WellnessReminderPayload,
} from "./wellnessExercises.js";

/**
 * Animated nudge above the taskbar — stretch or eye break. Pulses gently until
 * dismissed or the user taps Start (opens the wellness panel on the right tab).
 */
export function WellnessReminderBanner() {
  const [active, setActive] = useState<WellnessReminderPayload | null>(null);

  useEffect(() => {
    const onReminder = (e: Event) => {
      const detail = (e as CustomEvent<WellnessReminderPayload>).detail;
      if (detail?.kind) setActive(detail);
    };
    window.addEventListener(WELLNESS_REMINDER_EVENT, onReminder);
    return () => window.removeEventListener(WELLNESS_REMINDER_EVENT, onReminder);
  }, []);

  if (!active) return null;

  const Icon = active.kind === "stretch" ? FitnessCenter : RemoveRedEye;
  const section = active.kind === "stretch" ? "stretch" : "eyes";

  return (
    <Box
      className={`esti-wellness-reminder esti-wellness-reminder--${active.kind}`}
      role="status"
      aria-live="polite"
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box className="esti-wellness-reminder__icon-wrap" aria-hidden>
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
            {active.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {active.subtitle}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            openWellness(section);
            setActive(null);
          }}
        >
          Start
        </Button>
        <IconButton size="small" aria-label="Dismiss reminder" onClick={() => setActive(null)}>
          <Close fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
