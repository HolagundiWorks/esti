import { useEffect, useState } from "react";
import {
  ACCOUNT_STATUS_LABEL,
  type AccountSignupProfile,
  type AccountStatus,
} from "@esti/contracts";
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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { StatusDot } from "../../components/StatusTag.js";
import { trpc } from "../lib/trpc";

type AccountRow = {
  id: string;
  publicId: string | null;
  email: string;
  name: string | null;
  status: AccountStatus;
  profile: AccountSignupProfile | null;
  isPlatformAdmin: boolean;
  createdAt: Date | string;
  suspendedAt: Date | string | null;
};

const fmt = (d: Date | string) => new Date(d).toLocaleDateString();

const statusColor: Record<AccountStatus, string> = {
  ACTIVE: "green",
  SUSPENDED: "red",
  DELETED: "gray",
};

function suggestPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

function profileField(
  profile: AccountSignupProfile | null | unknown,
  key: keyof AccountSignupProfile,
): string {
  if (!profile || typeof profile !== "object") return "—";
  const v = (profile as AccountSignupProfile)[key];
  return typeof v === "string" && v.trim() ? v : "—";
}

/** Manual account support: search, password reset, suspend/reactivate, delete. */
export default function AccountsTab() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [reset, setReset] = useState<{ email: string } | null>(null);
  const [remove, setRemove] = useState<AccountRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function load(q?: string) {
    const rows = await trpc.admin.accounts.list.query({ search: q || undefined });
    setAccounts(rows as AccountRow[]);
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

  async function setStatus(row: AccountRow, status: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    setNote(null);
    try {
      await trpc.admin.accounts.setStatus.mutate({ accountId: row.id, status });
      setNote({
        kind: "success",
        text:
          status === "SUSPENDED"
            ? `Suspended ${row.email}. Licences for their owned companies are paused.`
            : `Reactivated ${row.email}.`,
      });
      await load(search);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function doRemove() {
    if (!remove) return;
    setBusy(true);
    try {
      await trpc.admin.accounts.remove.mutate({
        accountId: remove.id,
        confirmEmail,
      });
      setNote({ kind: "success", text: `Deleted account ${remove.email}.` });
      setRemove(null);
      setConfirmEmail("");
      await load(search);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<AccountRow>[] = [
    { field: "email", headerName: "Email", flex: 1.3, minWidth: 180 },
    {
      field: "firmName",
      headerName: "Firm",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => profileField(row.profile, "firmName"),
    },
    {
      field: "mobile",
      headerName: "Mobile",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (_v, row) => profileField(row.profile, "mobile"),
    },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={statusColor[p.row.status]} label={ACCOUNT_STATUS_LABEL[p.row.status]} />
      ),
    },
    {
      field: "isPlatformAdmin",
      headerName: "Role",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) =>
        p.row.isPlatformAdmin ? (
          <StatusDot color="purple" label="Platform admin" />
        ) : null,
    },
    {
      field: "createdAt",
      headerName: "Created",
      flex: 0.7,
      minWidth: 100,
      renderCell: (p) => fmt(p.row.createdAt),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 280,
      renderCell: (p) => {
        const row = p.row;
        if (row.status === "DELETED") return null;
        return (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
            <Button variant="text" size="small" onClick={() => openReset(row.email)}>
              Reset PW
            </Button>
            {row.status === "ACTIVE" && !row.isPlatformAdmin && (
              <Button variant="text" size="small" color="warning" onClick={() => setStatus(row, "SUSPENDED")}>
                Suspend
              </Button>
            )}
            {row.status === "SUSPENDED" && (
              <Button variant="text" size="small" color="success" onClick={() => setStatus(row, "ACTIVE")}>
                Reactivate
              </Button>
            )}
            {!row.isPlatformAdmin && (
              <Button
                variant="text"
                size="small"
                color="error"
                onClick={() => {
                  setRemove(row);
                  setConfirmEmail("");
                  setNote(null);
                }}
              >
                Delete
              </Button>
            )}
          </Stack>
        );
      },
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            id="account-search"
            label="Search accounts"
            placeholder="email · AORMS-U · firm · mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="outlined" disabled={busy}>
            Search
          </Button>
        </Stack>
      </Box>

      <DataGrid
        rows={accounts.filter((a) => a.status !== "DELETED")}
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
              Sets a new password immediately. Copy it and send it to the person yourself —
              this does not email them automatically.
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
          <Button variant="contained" disabled={newPassword.length < 8 || busy} onClick={doReset}>
            {busy ? "Saving…" : "Reset"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={remove !== null} onClose={() => setRemove(null)} fullWidth maxWidth="sm">
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Soft-deletes <strong>{remove?.email}</strong>, revokes their licences, and frees the
              email for a future signup. Type the account email to confirm.
            </Typography>
            <TextField
              label="Confirm email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setRemove(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              busy ||
              !remove ||
              confirmEmail.trim().toLowerCase() !== remove.email.toLowerCase()
            }
            onClick={doRemove}
          >
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
