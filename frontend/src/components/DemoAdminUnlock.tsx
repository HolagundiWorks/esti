import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

/** Demo-only — unlock admin mutations with DEMO_MASTER_PASSWORD. */
export function DemoAdminUnlock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const unlock = trpc.auth.unlockDemoAdmin.useMutation({
    onSuccess: () => {
      setOpen(false);
      setPassword("");
    },
  });

  if (!user?.isDemo) return null;

  return (
    <>
      <Button variant="text" size="small" color="inherit" onClick={() => setOpen(true)}>
        Demo admin
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Demo master password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the demo master password to change users, credentials, and other
              admin settings on this demo workspace for this session.
            </Typography>
            <TextField
              type="password"
              label="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoFocus
            />
            {unlock.error && (
              <Typography variant="body2" color="error">
                {unlock.error.message}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!password || unlock.isPending}
            onClick={() => unlock.mutate({ password })}
          >
            Unlock
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
