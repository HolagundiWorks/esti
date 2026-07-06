import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  ASSIGNABLE_STAFF_ROLES,
  GENERAL_STAFF_ROLES,
  PLAN_LABEL,
  PLAN_LIMITS,
  type Plan,
  STAFF_ROLE_LABEL,
  USER_TYPE_LABEL,
  accessLabelForUser,
  isStaffRole,
  userType,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

const ROLE_LABEL: Record<string, string> = {
  ...STAFF_ROLE_LABEL,
  CONSULTANT: "Staff / Consultant",
  CLIENT: "Client",
};

const TYPE_TAG_COLOR: Record<string, "purple" | "gray" | "blue" | "teal" | "cyan"> = {
  COMPANY: "purple",
  STAFF: "gray",
  CLIENT: "blue",
  CONSULTANT: "teal",
  CONTRACTOR: "cyan",
};

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

export function Users() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.users.list.useQuery();
  // Plan + seat caps are license-derived (Phase B) — activation lives in Company.
  const licenseQ = trpc.license.status.useQuery();
  const invalidate = () => utils.users.list.invalidate();
  const plan = (licenseQ.data?.plan ?? "LITE") as Plan;
  const isLite = plan === "LITE";
  // Lite only offers general staff seats (no accountant/HR functional seats).
  const roleOptions = isLite ? GENERAL_STAFF_ROLES : ASSIGNABLE_STAFF_ROLES;

  // Active-seat usage per functional bucket. Only enabled logins consume a seat;
  // a disabled account frees its seat. The single OWNER (admin) is pinned.
  const rows = listQ.data ?? [];
  const activeIn = (roles: readonly string[]) =>
    rows.filter((u) => roles.includes(u.role) && !u.disabled).length;
  // Seat caps come from the licence (with plan defaults as the fallback).
  const caps = licenseQ.data?.seats ?? PLAN_LIMITS[plan];
  const seats: Array<{ label: string; used: number; cap: number | null }> = [
    { label: "Admin", used: rows.filter((u) => u.role === "OWNER").length, cap: 1 },
    { label: "Accountant", used: activeIn(["ACCOUNTANT"]), cap: caps.accountants },
    { label: "HR manager", used: activeIn(["HR_MANAGER"]), cap: caps.hrManagers },
    { label: "Staff", used: activeIn(GENERAL_STAFF_ROLES), cap: caps.staff },
  ].filter((s) => s.cap === null || s.cap > 0);

  const setDisabled = trpc.users.setDisabled.useMutation({
    onSuccess: invalidate,
  });
  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => {
      invalidate();
      setMsg("Role updated");
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{
    email: string;
    fullName: string;
    password: string;
    role: (typeof ASSIGNABLE_STAFF_ROLES)[number];
  }>({ email: "", fullName: "", password: "", role: "ASSOCIATE" });
  const [msg, setMsg] = useState<string | null>(null);
  const createStaff = trpc.users.createStaff.useMutation({
    onSuccess: (u) => {
      invalidate();
      setAddOpen(false);
      setForm({ email: "", fullName: "", password: "", role: "ASSOCIATE" });
      setMsg(`Staff login created for ${u.email}`);
    },
  });

  const [reset, setReset] = useState<{ id: string; email: string } | null>(
    null,
  );
  const [resetPw, setResetPw] = useState("");
  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      setReset(null);
      setResetPw("");
      setMsg("Password reset");
    },
  });

  // Link a firm login to a central AORMS-U identity (portable person).
  const [link, setLink] = useState<{ id: string; email: string } | null>(null);
  const [linkVal, setLinkVal] = useState("");
  const linkIdentity = trpc.users.linkIdentity.useMutation({
    onSuccess: () => {
      invalidate();
      setLink(null);
      setLinkVal("");
      setMsg("Identity linked");
    },
  });

  // U-4 migration path: one-time (re-runnable) push of every linked login's
  // unified type to the hub, for accounts linked before U-3b shipped.
  const resync = trpc.users.resyncIdentityTypes.useMutation({
    onSuccess: (r) => setMsg(`Synced ${r.synced} of ${r.total} linked identities to the hub`),
    onError: (err) =>
      setMsg(
        err.message === "No identity hub configured"
          ? "No identity hub is configured on this install — nothing to sync."
          : `Sync failed: ${err.message}`,
      ),
  });

  const columns: GridColDef[] = [
    { field: "email", headerName: "Email", flex: 1.4, minWidth: 200 },
    { field: "fullName", headerName: "Name", flex: 1, minWidth: 140 },
    {
      field: "type",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      valueGetter: (_v, row) => USER_TYPE_LABEL[userType(row)],
      renderCell: (p) => {
        const type = userType(p.row);
        return <TagChip color={TYPE_TAG_COLOR[type] ?? "gray"} label={USER_TYPE_LABEL[type]} />;
      },
    },
    {
      field: "level",
      headerName: "Level",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => accessLabelForUser(row),
    },
    {
      field: "role",
      headerName: "Role",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => {
        const u = p.row;
        const isSelf = u.id === user?.id;
        const scope =
          u.role === "CLIENT"
            ? " (client portal)"
            : u.consultantId
              ? " (consultant portal)"
              : "";
        if (!isSelf && u.role !== "OWNER" && !u.clientId && !u.consultantId) {
          return (
            <TextField
              select
              size="small"
              variant="standard"
              value={isStaffRole(u.role) ? u.role : "ASSOCIATE"}
              onChange={(e) =>
                setRole.mutate({
                  id: u.id,
                  role: e.target.value as (typeof ASSIGNABLE_STAFF_ROLES)[number],
                })
              }
              sx={{ minWidth: 150 }}
              slotProps={{ htmlInput: { "aria-label": "User role" } }}
            >
              {roleOptions.map((r) => (
                <MenuItem key={r} value={r}>
                  {STAFF_ROLE_LABEL[r]}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return (
          <span>
            {ROLE_LABEL[u.role] ?? u.role}
            {scope}
          </span>
        );
      },
    },
    {
      field: "accountPublicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 130,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      valueGetter: (_v, row) => (row.disabled ? "Disabled" : "Active"),
      renderCell: (p) => (
        <TagChip color={p.row.disabled ? "red" : "green"} label={p.row.disabled ? "Disabled" : "Active"} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      minWidth: 320,
      flex: 1.6,
      renderCell: (p) => {
        const u = p.row;
        const isSelf = u.id === user?.id;
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
            <Button variant="text" size="small" onClick={() => setReset({ id: u.id, email: u.email })}>
              Reset password
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setLink({ id: u.id, email: u.email });
                setLinkVal(u.accountPublicId ?? "");
              }}
            >
              Link ID
            </Button>
            {!isSelf && (
              <Button
                variant="text"
                size="small"
                onClick={() => setDisabled.mutate({ id: u.id, disabled: !u.disabled })}
              >
                {u.disabled ? "Enable" : "Disable"}
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Users & access"
        description="Owner / staff / portal logins. Client and consultant portal logins are created from their records (Clients / Consultants)."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => resync.mutate()}
              disabled={resync.isPending}
            >
              {resync.isPending ? "Syncing…" : "Resync identity types"}
            </Button>
            <Button variant="contained" onClick={() => setAddOpen(true)}>Add staff login</Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle1" component="h3" className="esti-label">Seat usage</Typography>
            <TagChip color={plan === "LITE" ? "gray" : "blue"} label={PLAN_LABEL[plan]} />
          </Stack>
          <Grid container spacing={2}>
            {seats.map((s) => (
              <Grid key={s.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                {s.cap === null ? (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" className="esti-label">{s.label}</Typography>
                    <Typography variant="body2">{s.used} active · Unlimited</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" className="esti-label">{s.label}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (s.used / s.cap) * 100)}
                      color={s.used >= s.cap ? "error" : "primary"}
                    />
                    <Typography variant="caption" color="text.secondary">{s.used} / {s.cap} seats</Typography>
                  </Stack>
                )}
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Paper>

      {msg && (
        <Alert severity="success" onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h3">Logins</Typography>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={listQ.isLoading}
            density="compact"
            rowHeight={52}
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Stack>
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add staff login</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">Creates an office staff login at the chosen seniority tier.</Typography>
            <TextField
              id="u-name"
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <TextField
              id="u-email"
              label="Login email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              id="u-role"
              select
              label="Role (seniority tier)"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as (typeof ASSIGNABLE_STAFF_ROLES)[number],
                }))
              }
            >
              {roleOptions.map((r) => (
                <MenuItem key={r} value={r}>{STAFF_ROLE_LABEL[r]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="u-pw"
              label="Temporary password (min 8 chars)"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            {createStaff.error && (
              <Alert severity="error">{createStaff.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !form.email ||
              form.fullName.length < 2 ||
              form.password.length < 8 ||
              createStaff.isPending
            }
            onClick={() => createStaff.mutate(form)}
          >
            {createStaff.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reset !== null} onClose={() => setReset(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reset password — {reset?.email ?? ""}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              id="u-reset"
              label="New password (min 8 chars)"
              type="password"
              fullWidth
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setReset(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={resetPw.length < 8 || resetPassword.isPending}
            onClick={() => reset && resetPassword.mutate({ id: reset.id, password: resetPw })}
          >
            {resetPassword.isPending ? "Saving…" : "Reset"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={link !== null} onClose={() => setLink(null)} fullWidth maxWidth="sm">
        <DialogTitle>Link identity — {link?.email ?? ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Link this firm login to a person&apos;s portable AORMS-U identity so their
              certifications and growth follow them. Leave blank to unlink.
            </Typography>
            <TextField
              id="u-link"
              label="AORMS-U handle"
              placeholder="AORMS-U-2K4P9F"
              value={linkVal}
              onChange={(e) => setLinkVal(e.target.value)}
            />
            {linkIdentity.error && (
              <Alert severity="error">{linkIdentity.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setLink(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={linkIdentity.isPending}
            onClick={() =>
              link &&
              linkIdentity.mutate({ id: link.id, accountPublicId: linkVal.trim() || null })
            }
          >
            {linkIdentity.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
