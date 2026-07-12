import { Box, Typography } from "@mui/material";
import { Surface } from "@hcw/ui-kit";
import { useEstiActivity } from "../lib/esti-activity.js";

/**
 * Rail orchestration status — the rail's window into what ESTI is orchestrating for
 * the current tab (docs/esti/HCW-AI-ORCHESTRATION-UX.md: "orchestration lives in the
 * rail"). Calm at rest — renders nothing when ESTI is idle; lifts to the glass (live)
 * layer while ESTI is working. The command bar (Ask ESTI) drives it via the shared
 * {@link useEstiActivity} signal.
 */
export function EstiOrchestrationStatus() {
  const activity = useEstiActivity();
  if (activity.status === "idle") return null;

  return (
    <Surface
      layer="glass"
      role="status"
      aria-live="polite"
      sx={{ p: 1.5, mb: 2 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Box
          className="esti-qpulse"
          aria-hidden
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flex: "0 0 auto",
            bgcolor: "primary.main",
          }}
        />
        <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
          ESTI · orchestrating
        </Typography>
      </Box>
      <Typography variant="body2" component="p">
        {activity.operation}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        on {activity.context}
      </Typography>
    </Surface>
  );
}
