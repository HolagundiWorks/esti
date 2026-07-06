import { Alert, Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
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
    if (settingsQ.data) setRequired(settingsQ.data.uploadPasswordRequired);
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
    <Box sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h2">Upload protection</Typography>
        <Typography variant="body2">
          When enabled, every staff member must enter a shared upload password before
          drawings, photos, bank statements, tender documents, or the firm logo can be
          stored. Login credentials are not accepted — set a dedicated upload password
          below.
        </Typography>
        {msg && <Alert severity="success" onClose={() => setMsg(null)}>{msg}</Alert>}
        {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
        <FormControlLabel
          control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
          label="Require upload password"
        />
        {required && (
          <TextField
            id="upload-password-set"
            type="password"
            label={configured ? "New upload password (optional)" : "Upload password"}
            helperText={
              configured
                ? "Leave blank to keep the current password."
                : `Minimum ${UPLOAD_PASSWORD_MIN_LENGTH} characters.`
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            fullWidth
          />
        )}
        <Box>
          <Button
            variant="contained"
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
        </Box>
      </Stack>
    </Box>
  );
}
