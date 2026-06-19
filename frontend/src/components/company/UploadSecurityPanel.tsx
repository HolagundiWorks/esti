import {
  Button,
  InlineNotification,
  PasswordInput,
  Stack,
  Tile,
  Toggle,
} from "@carbon/react";
import { UPLOAD_PASSWORD_MIN_LENGTH } from "@esti/contracts";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function UploadSecurityPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const [required, setRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      setRequired(settingsQ.data.uploadPasswordRequired);
    }
  }, [settingsQ.data]);

  const save = trpc.settings.setUploadSecurity.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      setPassword("");
      setMsg("Upload security settings saved");
      setErr(null);
    },
    onError: (e) => setErr(e.message),
  });

  const configured = settingsQ.data?.uploadPasswordConfigured ?? false;

  return (
    <Tile style={{ maxWidth: 760 }}>
      <Stack gap={5}>
        <h2>Upload protection</h2>
        <p>
          When enabled, every staff member must enter a shared upload password before
          drawings, photos, bank statements, tender documents, or the firm logo can be
          stored. Login credentials are not accepted — set a dedicated upload password
          below.
        </p>
        {msg ? (
          <InlineNotification
            kind="success"
            title="Saved"
            subtitle={msg}
            lowContrast
            onCloseButtonClick={() => setMsg(null)}
          />
        ) : null}
        {err ? (
          <InlineNotification
            kind="error"
            title="Could not save"
            subtitle={err}
            lowContrast
            onCloseButtonClick={() => setErr(null)}
          />
        ) : null}
        <Toggle
          id="upload-required"
          labelText="Require upload password"
          labelB="On"
          labelA="Off"
          toggled={required}
          onToggle={(checked) => setRequired(checked)}
        />
        {required ? (
          <PasswordInput
            id="upload-password-set"
            labelText={configured ? "New upload password (optional)" : "Upload password"}
            helperText={
              configured
                ? "Leave blank to keep the current password."
                : `Minimum ${UPLOAD_PASSWORD_MIN_LENGTH} characters.`
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        ) : null}
        <Button
          disabled={save.isPending || (required && !configured && password.length < UPLOAD_PASSWORD_MIN_LENGTH)}
          onClick={() =>
            save.mutate({
              uploadPasswordRequired: required,
              uploadPassword: password.trim() || undefined,
            })
          }
        >
          {save.isPending ? "Saving…" : "Save upload protection"}
        </Button>
      </Stack>
    </Tile>
  );
}
