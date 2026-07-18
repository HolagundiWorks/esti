import {
  Alert,
  AlertTitle,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import ContentCopy from "@mui/icons-material/ContentCopy";
import type { WorkloadCalendarScope } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function WorkloadCalendarSync() {
  const utils = trpc.useUtils();
  const [scope, setScope] = useState<WorkloadCalendarScope>("mine");
  const [copied, setCopied] = useState(false);

  const subQ = trpc.workload.calendarSubscription.useQuery({
    scope,
    origin: window.location.origin,
  });

  const regenerate = trpc.workload.regenerateCalendarToken.useMutation({
    meta: { errorTitle: "Couldn't regenerate the calendar link" },
    onSuccess: () => {
      utils.workload.calendarSubscription.invalidate();
    },
  });

  const httpsUrl = subQ.data?.httpsUrl ?? "";
  const webcalUrl = subQ.data?.webcalUrl ?? "";
  const canOffice = subQ.data?.canOfficeScope ?? false;

  const googleHelp =
    "Google Calendar → Other calendars → + → From URL → paste the HTTPS link below.";

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CalendarMonth sx={{ fontSize: 20 }} aria-hidden />
          <Typography variant="h6">Sync with Google Calendar</Typography>
        </Stack>
        <Typography variant="body2">
          Subscribe to your open task due dates as an iCal feed. Google refreshes
          subscribed calendars about once per hour.
        </Typography>

        {canOffice && (
          <TextField
            id="cal-scope"
            select
            label="Calendar scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as WorkloadCalendarScope)}
          >
            <MenuItem value="mine">My tasks</MenuItem>
            <MenuItem value="office">Whole office (all due tasks)</MenuItem>
          </TextField>
        )}

        <TextField
          id="cal-https"
          label="Subscription URL (HTTPS)"
          helperText={googleHelp}
          value={httpsUrl}
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopy />}
            aria-label="Copy subscription URL"
            onClick={() => {
              if (!httpsUrl) return;
              void navigator.clipboard.writeText(httpsUrl).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied" : "Copy URL"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={!webcalUrl}
            onClick={() => window.open(webcalUrl, "_blank", "noopener,noreferrer")}
          >
            Open webcal link
          </Button>
          <Button
            variant="text"
            size="small"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? "Rotating…" : "Rotate link"}
          </Button>
        </Stack>

        {copied && (
          <Alert severity="success" onClose={() => setCopied(false)}>
            <AlertTitle>Link copied</AlertTitle>
            Paste it in Google Calendar under Other calendars → From URL.
          </Alert>
        )}

        <p className="esti-label--secondary">
          Rotating the link revokes the old URL. Keep this link private — anyone
          with it can read task titles and due dates in the feed scope you chose.
        </p>
      </Stack>
    </Box>
  );
}
