import {
  Button,
  InlineNotification,
  Modal,
  PasswordInput,
  Stack,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function DataTools() {
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState<string | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const purge = trpc.admin.purge.useMutation({
    onSuccess: (r) => {
      utils.invalidate();
      setPurgeOpen(false);
      setPwd("");
      setMsg(`Data reset complete (${r.tablesWiped} tables cleared).`);
    },
  });

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={5}>
        <h2>Data tools</h2>
        {msg && (
          <InlineNotification
            kind="success"
            title="Done"
            subtitle={msg}
            lowContrast
            onCloseButtonClick={() => setMsg(null)}
          />
        )}
        <p>
          Reset everything to a clean slate. Reset keeps your firm profile, this
          owner login and rate book reference data — all projects, clients, invoices,
          drawings, HR and other logins are permanently removed.
        </p>
        <Stack orientation="horizontal" gap={2}>
          <Button kind="danger" onClick={() => setPurgeOpen(true)}>
            Reset all data…
          </Button>
        </Stack>
      </Stack>

      <Modal
        open={purgeOpen}
        danger
        modalHeading="Reset all data?"
        primaryButtonText={purge.isPending ? "Resetting…" : "Permanently reset"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={pwd.length === 0 || purge.isPending}
        onRequestClose={() => {
          setPurgeOpen(false);
          setPwd("");
          purge.reset();
        }}
        onRequestSubmit={() => purge.mutate({ password: pwd })}
      >
        <Stack gap={5}>
          <p>
            This permanently deletes <strong>all operational data</strong> and
            cannot be undone. Enter your admin password to confirm.
          </p>
          <PasswordInput
            id="purge-pwd"
            labelText="Admin password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          {purge.error && (
            <InlineNotification
              kind="error"
              lowContrast
              title="Reset failed"
              subtitle={purge.error.message}
            />
          )}
        </Stack>
      </Modal>
    </Tile>
  );
}
