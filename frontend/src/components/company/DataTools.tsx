import {
  Button,
  InlineNotification,
  Modal,
  PasswordInput,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";

const DEMO_RESET_CONFIRM = "RESET DEMO DATA";

export function DataTools() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isDemoUser = Boolean(user?.isDemo);
  const [msg, setMsg] = useState<string | null>(null);
  const importDemo = trpc.admin.importDemo.useMutation({
    onSuccess: (r) => {
      utils.invalidate();
      setMsg(
        `Demo data imported: ${r.clientsCreated} clients, ${r.projectsCreated} projects.`,
      );
    },
  });
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [demoResetOpen, setDemoResetOpen] = useState(false);
  const [demoResetPhrase, setDemoResetPhrase] = useState("");
  const [demoResetPwd, setDemoResetPwd] = useState("");
  const purge = trpc.admin.purge.useMutation({
    onSuccess: (r) => {
      utils.invalidate();
      setPurgeOpen(false);
      setPwd("");
      setMsg(`Data reset complete (${r.tablesWiped} tables cleared).`);
    },
  });
  const resetDemo = trpc.admin.resetDemoData.useMutation({
    onSuccess: (r) => {
      utils.invalidate();
      setDemoResetOpen(false);
      setDemoResetPhrase("");
      setDemoResetPwd("");
      setMsg("Demo data reset complete. The team demo workspace now matches the canonical dataset.");
      if (r.sessionResetRequired) {
        window.setTimeout(() => window.location.assign("/login"), 900);
      }
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
          Load sample records to explore the system, or reset everything to a
          clean slate. Reset keeps your firm profile, this owner login and DSR
          reference data — all projects, clients, invoices, drawings, HR and other
          logins are permanently removed.
        </p>
        <p>
          Demo reset rebuilds the local/VPS team demo workspace from the same seed,
          including dashboard pressure, letters, contracts, MOMs, lessons,
          appointments and role logins.
        </p>
        <Stack orientation="horizontal" gap={2}>
          <Button
            kind="tertiary"
            disabled={importDemo.isPending}
            onClick={() => importDemo.mutate()}
          >
            {importDemo.isPending ? "Importing…" : "Import demo data"}
          </Button>
          <Button kind="danger" onClick={() => setPurgeOpen(true)}>
            Reset all data…
          </Button>
          <Button kind="danger--tertiary" onClick={() => setDemoResetOpen(true)}>
            Reset demo data…
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

      <Modal
        open={demoResetOpen}
        danger
        modalHeading="Reset demo data?"
        primaryButtonText={resetDemo.isPending ? "Resetting…" : "Reset demo data"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={demoResetPhrase !== DEMO_RESET_CONFIRM || (!isDemoUser && demoResetPwd.length === 0) || resetDemo.isPending}
        onRequestClose={() => {
          setDemoResetOpen(false);
          setDemoResetPhrase("");
          setDemoResetPwd("");
          resetDemo.reset();
        }}
        onRequestSubmit={() => resetDemo.mutate({
          confirmPhrase: DEMO_RESET_CONFIRM,
          password: demoResetPwd || undefined,
        })}
      >
        <Stack gap={5}>
          <p>
            This rebuilds the demo workspace so local development and VPS demo
            use the same records. Type <strong>{DEMO_RESET_CONFIRM}</strong> to
            confirm.
          </p>
          <TextInput
            id="demo-reset-confirm"
            labelText="Confirmation phrase"
            value={demoResetPhrase}
            onChange={(e) => setDemoResetPhrase(e.target.value)}
          />
          {!isDemoUser && (
            <PasswordInput
              id="demo-reset-pwd"
              labelText="Admin password"
              value={demoResetPwd}
              onChange={(e) => setDemoResetPwd(e.target.value)}
            />
          )}
          {resetDemo.error && (
            <InlineNotification
              kind="error"
              lowContrast
              title="Demo reset failed"
              subtitle={resetDemo.error.message}
            />
          )}
        </Stack>
      </Modal>
    </Tile>
  );
}
