import Notifications from "@mui/icons-material/Notifications";
import NotificationsOff from "@mui/icons-material/NotificationsOff";
import { Badge, Box, Button, Chip, IconButton, Popover, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

const KEY = "esti-dismissed-alerts";

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

const chipSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color})`,
  color: `var(--cds-tag-color-${color})`,
});

/**
 * Dock bell: alert count badge + a floating (portaled) Popover panel opening above
 * the button, with per-item and clear-all dismiss. Material UI.
 */
export function AlertsBell() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });

  const persist = (next: string[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setDismissed(next);
  };
  const all = alertsQ.data ?? [];
  const alerts = all.filter((a) => !dismissed.includes(a.id));
  const dismiss = (id: string) => persist([...new Set([...dismissed, id])]);
  const clearAll = () => persist([...new Set([...dismissed, ...alerts.map((a) => a.id)])]);

  const sevColor = (s: string) => (s === "high" ? "red" : s === "medium" ? "purple" : "gray");

  return (
    <>
      <Tooltip title="Alerts">
        <IconButton size="small" aria-label="Alerts" onClick={(e) => setAnchor(e.currentTarget)}>
          <Badge badgeContent={alerts.length} color="error">
            <Notifications />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 440, p: 1.5 } } }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>Alerts ({alerts.length})</Typography>
            {alerts.length > 0 && (
              <Button size="small" variant="text" onClick={clearAll}>Clear all</Button>
            )}
          </Stack>

          {alerts.length === 0 && (
            <Stack spacing={1} sx={{ alignItems: "center", py: 3 }}>
              <NotificationsOff />
              <Typography variant="body2">Nothing needs attention</Typography>
            </Stack>
          )}

          {alerts.map((a) => (
            <Box key={a.id} sx={{ border: 1, borderColor: "divider", p: 1 }}>
              <Stack spacing={0.5}>
                <Box>
                  <Chip size="small" label={a.severity} sx={chipSx(sevColor(a.severity))} />
                </Box>
                <Link to={`/projects/${a.projectId}`} onClick={() => setAnchor(null)}>
                  {a.title}
                </Link>
                <Typography variant="caption" color="text.secondary">
                  {a.detail} · {a.projectRef}
                </Typography>
                <Box>
                  <Button size="small" variant="text" onClick={() => dismiss(a.id)}>Dismiss</Button>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Popover>
    </>
  );
}
