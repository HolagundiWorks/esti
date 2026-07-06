import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { type Me, totpDisable, totpEnable, totpSetup } from "./lib/auth";

function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

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
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="subtitle1" component="h3" className="esti-label">
            Two-factor authentication
          </Typography>
          <TagChip color={me.totpEnabled ? "green" : "gray"} label={me.totpEnabled ? "On" : "Off"} />
        </Stack>

        {!me.totpEnabled && !setup && (
          <>
            <Typography variant="body2">
              Protect this account with an authenticator app (Google Authenticator, Authy,
              1Password…).
            </Typography>
            <Box>
              <Button variant="outlined" disabled={busy} onClick={begin}>
                Enable authenticator
              </Button>
            </Box>
          </>
        )}

        {setup && (
          <Box component="form" onSubmit={confirm}>
            <Stack spacing={2}>
              <Typography variant="body2">
                Scan this QR with your authenticator app — or enter the secret key manually — then
                type the 6-digit code to confirm.
              </Typography>
              <QRCodeSVG value={setup.otpauthUrl} size={180} marginSize={4} />
              <TextField
                id="totp-secret"
                label="Secret key"
                value={setup.secret}
                slotProps={{ input: { readOnly: true } }}
                helperText="Enter this in your app if you can't scan the QR."
                fullWidth
              />
              <TextField
                id="totp-uri"
                label="otpauth URI"
                value={setup.otpauthUrl}
                slotProps={{ input: { readOnly: true } }}
                fullWidth
              />
              <TextField
                id="totp-confirm"
                label="6-digit code"
                placeholder="123456"
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={busy || code.length < 6}>
                  Confirm
                </Button>
                <Button type="button" variant="text" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {me.totpEnabled && !disabling && (
          <Box>
            <Button
              variant="text"
              color="error"
              size="small"
              onClick={() => {
                setDisabling(true);
                setCode("");
                setNote(null);
              }}
            >
              Disable
            </Button>
          </Box>
        )}

        {me.totpEnabled && disabling && (
          <Box component="form" onSubmit={turnOff}>
            <Stack direction="row" spacing={1}>
              <TextField
                id="totp-off"
                label="Current code to disable"
                placeholder="123456"
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" variant="contained" color="error" disabled={busy || code.length < 6}>
                Confirm disable
              </Button>
              <Button type="button" variant="text" onClick={() => setDisabling(false)}>
                Cancel
              </Button>
            </Stack>
          </Box>
        )}

        {note && (
          <Alert severity={note.kind} onClose={() => setNote(null)}>
            <AlertTitle>{note.kind === "success" ? "Done" : "Error"}</AlertTitle>
            {note.text}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
