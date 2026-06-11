import {
  Button,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

export function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName) setName(user.fullName);
  }, [user?.fullName]);

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setMsg("Profile updated");
    },
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      setPw({ current: "", next: "", confirm: "" });
      setMsg("Password changed");
    },
  });

  return (
    <div>
      <h1>My profile</h1>
      <p style={{ marginBottom: 24 }}>Signed in as {user?.email}</p>
      {msg && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle={msg}
          lowContrast
          onCloseButtonClick={() => setMsg(null)}
        />
      )}

      <Tile style={{ maxWidth: 520 }}>
        <Stack gap={5}>
          <h4>Display name</h4>
          <TextInput
            id="pf-name"
            labelText="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            disabled={name.length < 2 || updateProfile.isPending}
            onClick={() => updateProfile.mutate({ fullName: name })}
          >
            {updateProfile.isPending ? "Saving…" : "Save name"}
          </Button>
        </Stack>
      </Tile>

      <Tile style={{ maxWidth: 520, marginTop: 16 }}>
        <Stack gap={5}>
          <h4>Change password</h4>
          <TextInput
            id="pf-cur"
            labelText="Current password"
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
          />
          <TextInput
            id="pf-new"
            labelText="New password (min 8 chars)"
            type="password"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          />
          <TextInput
            id="pf-conf"
            labelText="Confirm new password"
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          />
          {pw.next && pw.confirm && pw.next !== pw.confirm && (
            <p>Passwords do not match.</p>
          )}
          <Button
            disabled={
              !pw.current ||
              pw.next.length < 8 ||
              pw.next !== pw.confirm ||
              changePassword.isPending
            }
            onClick={() =>
              changePassword.mutate({
                currentPassword: pw.current,
                newPassword: pw.next,
              })
            }
          >
            {changePassword.isPending ? "Saving…" : "Change password"}
          </Button>
          {changePassword.error && (
            <InlineNotification
              kind="error"
              title="Could not change"
              subtitle={changePassword.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Tile>
    </div>
  );
}
