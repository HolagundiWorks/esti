import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function DataTools() {
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState<string | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const purge = trpc.admin.purge.useMutation({
    meta: { errorTitle: "Couldn't reset the data" },
    onSuccess: (r) => {
      utils.invalidate();
      setPurgeOpen(false);
      setPwd("");
      setMsg(`Data reset complete (${r.tablesWiped} tables cleared).`);
    },
  });

  const closePurge = () => {
    setPurgeOpen(false);
    setPwd("");
    purge.reset();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h2">Data tools</Typography>
        {msg && <Alert severity="success" onClose={() => setMsg(null)}>{msg}</Alert>}
        <Typography variant="body2">
          Reset everything to a clean slate. Reset keeps your firm profile, this
          owner login and rate book reference data — all projects, clients, invoices,
          drawings, HR and other logins are permanently removed.
        </Typography>
        <Box>
          <Button color="error" variant="contained" onClick={() => setPurgeOpen(true)}>
            Reset all data…
          </Button>
        </Box>
      </Stack>

      <Dialog aria-labelledby="data-tools-purge-title" open={purgeOpen} onClose={closePurge} fullWidth maxWidth="xs">
        <DialogTitle id="data-tools-purge-title">Reset all data?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              This permanently deletes <strong>all operational data</strong> and
              cannot be undone. Enter your admin password to confirm.
            </Typography>
            <TextField
              id="purge-pwd"
              type="password"
              label="Admin password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              fullWidth
            />
            {purge.error && <Alert severity="error">{purge.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={closePurge}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={pwd.length === 0 || purge.isPending}
            onClick={() => purge.mutate({ password: pwd })}
          >
            {purge.isPending ? "Resetting…" : "Permanently reset"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
