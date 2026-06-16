import {
  Button,
  CopyButton,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { Calendar } from "@carbon/icons-react";
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
    <Tile>
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={3}>
          <Calendar size={20} aria-hidden />
          <h4>Sync with Google Calendar</h4>
        </Stack>
        <p>
          Subscribe to your open task due dates as an iCal feed. Google refreshes
          subscribed calendars about once per hour.
        </p>

        {canOffice && (
          <Select
            id="cal-scope"
            labelText="Calendar scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as WorkloadCalendarScope)}
          >
            <SelectItem value="mine" text="My tasks" />
            <SelectItem value="office" text="Whole office (all due tasks)" />
          </Select>
        )}

        <TextInput
          id="cal-https"
          labelText="Subscription URL (HTTPS)"
          helperText={googleHelp}
          readOnly
          value={httpsUrl}
        />
        <Stack orientation="horizontal" gap={3}>
          <CopyButton
            iconDescription="Copy subscription URL"
            feedback={copied ? "Copied" : "Copy URL"}
            onClick={() => {
              if (!httpsUrl) return;
              void navigator.clipboard.writeText(httpsUrl).then(() => setCopied(true));
            }}
          />
          <Button
            kind="tertiary"
            size="sm"
            disabled={!webcalUrl}
            onClick={() => window.open(webcalUrl, "_blank", "noopener,noreferrer")}
          >
            Open webcal link
          </Button>
          <Button
            kind="ghost"
            size="sm"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? "Rotating…" : "Rotate link"}
          </Button>
        </Stack>

        {copied && (
          <InlineNotification
            kind="success"
            title="Link copied"
            subtitle="Paste it in Google Calendar under Other calendars → From URL."
            lowContrast
            onCloseButtonClick={() => setCopied(false)}
          />
        )}

        <p className="esti-label--secondary">
          Rotating the link revokes the old URL. Keep this link private — anyone
          with it can read task titles and due dates in the feed scope you chose.
        </p>
      </Stack>
    </Tile>
  );
}
