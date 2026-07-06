import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { trpc } from "../lib/trpc";

type Accounts = Awaited<ReturnType<typeof trpc.admin.accounts.list.query>>;

const fmt = (d: Date | string) => new Date(d).toLocaleDateString();
const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

/** A random, readable-enough password to seed the reset field (admin can edit it). */
function suggestPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

/** Manual account support: look up a customer account and reset its password by hand. */
export default function AccountsTab() {
  const [accounts, setAccounts] = useState<Accounts>([]);
  const [search, setSearch] = useState("");
  const [reset, setReset] = useState<{ email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function load(q?: string) {
    setAccounts(await trpc.admin.accounts.list.query({ search: q || undefined }));
  }
  useEffect(() => {
    void load();
  }, []);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    await load(search);
  }

  function openReset(email: string) {
    setReset({ email });
    setNewPassword(suggestPassword());
    setNote(null);
  }

  async function doReset() {
    if (!reset) return;
    setBusy(true);
    try {
      await trpc.admin.accounts.resetPassword.mutate({ email: reset.email, newPassword });
      setNote({
        kind: "success",
        text: `Password reset for ${reset.email}. Send them this password manually: ${newPassword}`,
      });
      setReset(null);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<Accounts[number]>[] = [
    { field: "email", headerName: "Email", flex: 1.4, minWidth: 200 },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    { field: "name", headerName: "Name", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
    {
      field: "isPlatformAdmin",
      headerName: "Role",
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: (p) =>
        p.row.isPlatformAdmin ? (
          <Chip size="small" label="Platform admin" sx={chipSx("green")} />
        ) : null,
    },
    {
      field: "createdAt",
      headerName: "Created",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => fmt(p.row.createdAt),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 150,
      renderCell: (p) => (
        <Button variant="text" size="small" onClick={() => openReset(p.row.email)}>
          Reset password
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      {note && (
        <Alert severity={note.kind} onClose={() => setNote(null)}>
          {note.text}
        </Alert>
      )}

      <Box component="form" onSubmit={doSearch}>
        <TextField
          id="account-search"
          label="Search by email or AORMS-U ID"
          placeholder="person@firm.in or AORMS-U-2K4P9F"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
      </Box>

      <DataGrid
        rows={accounts}
        columns={columns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />

      <Dialog open={reset !== null} onClose={() => setReset(null)} fullWidth maxWidth="sm">
        <DialogTitle>{`Reset password — ${reset?.email ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Sets a new password for this account immediately. Copy it and send it to the
              person yourself (phone, email, chat) — this does not email them automatically.
            </Typography>
            <TextField
              id="reset-pw"
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Pre-filled with a random password — edit if you prefer your own."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setReset(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={newPassword.length < 8 || busy}
            onClick={doReset}
          >
            {busy ? "Saving…" : "Reset"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
