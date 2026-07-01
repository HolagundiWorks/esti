import { useState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { type Me, totpDisable, totpEnable, totpSetup } from "./lib/auth";

/** Two-factor authenticator (TOTP) enrollment for the signed-in account. */
export default function Security({ me, onChange }: { me: Me; onChange: () => void }) {
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function begin() {
    setBusy(true);
    setNote(null);
    setSetup(await totpSetup());
    setCode("");
    setBusy(false);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setBusy(true);
    const res = await totpEnable(setup.secret, code);
    setBusy(false);
    if (!res.ok) {
      setNote({ kind: "error", text: "That code didn't match — try the current one." });
      return;
    }
    setSetup(null);
    setCode("");
    setNote({ kind: "success", text: "Two-factor authentication is on." });
    onChange();
  }

  async function turnOff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await totpDisable(code);
    setBusy(false);
    if (!res.ok) {
      setNote({ kind: "error", text: "That code didn't match — 2FA is still on." });
      return;
    }
    setDisabling(false);
    setCode("");
    setNote({ kind: "success", text: "Two-factor authentication is off." });
    onChange();
  }

  return (
    <Tile>
      <Stack gap={5}>
        <Stack gap={2} orientation="horizontal">
          <h3 className="esti-label">Two-factor authentication</h3>
          <Tag type={me.totpEnabled ? "green" : "gray"}>{me.totpEnabled ? "On" : "Off"}</Tag>
        </Stack>

        {!me.totpEnabled && !setup && (
          <>
            <p>Protect this account with an authenticator app (Google Authenticator, Authy, 1Password…).</p>
            <div>
              <Button kind="tertiary" disabled={busy} onClick={begin}>
                Enable authenticator
              </Button>
            </div>
          </>
        )}

        {setup && (
          <Form onSubmit={confirm}>
            <Stack gap={4}>
              <p>
                Add this account to your authenticator app — scan the URI below, or enter the
                secret key manually — then type the 6-digit code to confirm.
              </p>
              <TextInput
                id="totp-secret"
                labelText="Secret key"
                value={setup.secret}
                readOnly
                helperText="Enter this in your app if you can't scan."
              />
              <TextInput id="totp-uri" labelText="otpauth URI" value={setup.otpauthUrl} readOnly />
              <TextInput
                id="totp-confirm"
                labelText="6-digit code"
                placeholder="123456"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Stack gap={3} orientation="horizontal">
                <Button type="submit" kind="primary" disabled={busy || code.length < 6}>
                  Confirm
                </Button>
                <Button kind="ghost" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Form>
        )}

        {me.totpEnabled && !disabling && (
          <div>
            <Button kind="danger--ghost" size="sm" onClick={() => { setDisabling(true); setCode(""); setNote(null); }}>
              Disable
            </Button>
          </div>
        )}

        {me.totpEnabled && disabling && (
          <Form onSubmit={turnOff}>
            <Stack gap={3} orientation="horizontal">
              <TextInput
                id="totp-off"
                labelText="Current code to disable"
                placeholder="123456"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" kind="danger" disabled={busy || code.length < 6}>
                Confirm disable
              </Button>
              <Button kind="ghost" onClick={() => setDisabling(false)}>
                Cancel
              </Button>
            </Stack>
          </Form>
        )}

        {note && (
          <InlineNotification
            kind={note.kind}
            title={note.kind === "success" ? "Done" : "Error"}
            subtitle={note.text}
            lowContrast
            onCloseButtonClick={() => setNote(null)}
          />
        )}
      </Stack>
    </Tile>
  );
}
