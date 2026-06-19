import {
  Button,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  DEFAULT_ESCALATION_SETTINGS,
  type EscalationSettings,
  parseEscalationSettings,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function EscalationSettingsPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const [form, setForm] = useState<EscalationSettings>(DEFAULT_ESCALATION_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data?.escalationSettings) {
      setForm(parseEscalationSettings(settingsQ.data.escalationSettings));
    }
  }, [settingsQ.data]);

  const save = trpc.settings.setEscalationSettings.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      setMsg("Alert escalation rules saved");
    },
  });

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={5}>
        <h2>Alert escalation</h2>
        <p>
          Controls when client approvals, follow-ups, overdue tasks, and leave
          appear as immediate alerts vs the daily digest on the Alerts page.
        </p>
        {msg && (
          <InlineNotification
            kind="success"
            title="Saved"
            subtitle={msg}
            lowContrast
            onCloseButtonClick={() => setMsg(null)}
          />
        )}
        <TextInput
          id="esc-stale"
          labelText="Stale client approval (days)"
          helperText="Approvals unanswered for this many days become immediate alerts."
          type="number"
          value={String(form.staleApprovalDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, staleApprovalDays: Number(e.target.value) || 7 }))
          }
        />
        <TextInput
          id="esc-followup"
          labelText="Follow-up lead time (days before due)"
          helperText="0 = alert on the due date only."
          type="number"
          value={String(form.followUpLeadDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, followUpLeadDays: Number(e.target.value) || 0 }))
          }
        />
        <TextInput
          id="esc-task"
          labelText="Overdue task threshold (days past due)"
          type="number"
          value={String(form.taskOverdueDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, taskOverdueDays: Number(e.target.value) || 3 }))
          }
        />
        <TextInput
          id="esc-leave"
          labelText="Leave horizon (days ahead)"
          helperText="Approved leave starting within this window surfaces on alerts."
          type="number"
          value={String(form.leaveHorizonDays)}
          onChange={(e) =>
            setForm((f) => ({ ...f, leaveHorizonDays: Number(e.target.value) || 7 }))
          }
        />
        <Toggle
          id="esc-digest"
          labelText="Daily digest"
          labelB="On"
          labelA="Off"
          toggled={form.digestEnabled}
          onToggle={(checked) => setForm((f) => ({ ...f, digestEnabled: checked }))}
        />
        <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
          {save.isPending ? "Saving…" : "Save escalation rules"}
        </Button>
      </Stack>
    </Tile>
  );
}
