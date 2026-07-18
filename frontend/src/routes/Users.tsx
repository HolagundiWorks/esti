import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import {
  ASSIGNABLE_STAFF_ROLES,
  GENERAL_STAFF_ROLES,
  STAFF_ROLE_LABEL,
  STANDARD_LICENCE_LABEL,
  USER_TYPE_LABEL,
  accessLabelForUser,
  isStaffRole,
  userType,
} from "@esti/contracts";
import { useState } from "react";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useAuth } from "../lib/auth.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

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

export function Users({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.users.list.useQuery();
  const invalidate = () => utils.users.list.invalidate();
  const rows = listQ.data ?? [];
  const activeIn = (roles: readonly string[]) =>
    rows.filter((u) => roles.includes(u.role) && !u.disabled).length;
  const seats: Array<{ label: string; used: number }> = [
    { label: "Admin", used: rows.filter((u) => u.role === "OWNER").length },
    { label: "Accountant", used: activeIn(["ACCOUNTANT"]) },
    { label: "HR manager", used: activeIn(["HR_MANAGER"]) },
    { label: "Staff", used: activeIn(GENERAL_STAFF_ROLES) },
  ];
  const roleOptions = ASSIGNABLE_STAFF_ROLES;

  // Optimistic enable/disable (Doherty): flip the row immediately, roll back on
  // error, confirm with a toast (this toggle was previously silent — Nielsen #1).
  const setDisabled = trpc.users.setDisabled.useMutation({
    meta: { errorTitle: "Couldn't change the login state" },
    onMutate: async ({ id, disabled }) => {
      await utils.users.list.cancel();
      const prev = utils.users.list.getData();
      utils.users.list.setData(undefined, (old) =>
        old?.map((u) => (u.id === id ? { ...u, disabled } : u)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.users.list.setData(undefined, ctx.prev);
    },
    onSuccess: (_d, v) =>
      pushToast({ kind: "success", title: v.disabled ? "Login disabled" : "Login enabled" }),
    onSettled: invalidate,
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
    meta: { errorTitle: "Couldn't create the staff login" },
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
    meta: { errorTitle: "Couldn't reset the password" },
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

  useScreenActions(
    embedded || addOpen || reset !== null || link !== null
      ? []
      : [
          {
            id: "add-staff-login",
            zone: "center",
            tone: "primary",
            label: "Add staff login",
            icon: <AddIcon />,
            onClick: () => setAddOpen(true),
          },
          {
            id: "resync-identity-types",
            zone: "right",
            label: resync.isPending ? "Syncing…" : "Resync identity types",
            icon: <SyncIcon />,
            disabled: resync.isPending,
            onClick: () => resync.mutate(),
          },
        ],
    [embedded, addOpen, reset, link, resync.isPending],
  );

  const createBlockedReason =
    !form.email.trim()
      ? "Enter a login email."
      : form.fullName.trim().length < 2
        ? "Full name must be at least 2 characters."
        : form.password.length < 8
          ? "Temporary password must be at least 8 characters."
          : null;

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
        return <StatusDot color={TYPE_TAG_COLOR[type] ?? "gray"} label={USER_TYPE_LABEL[type]} />;
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
            ? ` (${AORMS_PORTALS.client.label.toLowerCase()})`
            : u.consultantId
              ? ` (${AORMS_PORTALS.consultant.label.toLowerCase()})`
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
        <StatusDot color={p.row.disabled ? "red" : "green"} label={p.row.disabled ? "Disabled" : "Active"} />
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
          <RowActionsMenu
            actions={[
              { label: "Reset password", onClick: () => setReset({ id: u.id, email: u.email }) },
              {
                label: "Link ID",
                onClick: () => {
                  setLink({ id: u.id, email: u.email });
                  setLinkVal(u.accountPublicId ?? "");
                },
              },
              !isSelf && {
                label: u.disabled ? "Enable" : "Disable",
                onClick: () => setDisabled.mutate({ id: u.id, disabled: !u.disabled }),
              },
            ]}
          />
        );
      },
    },
  ];

  const body = (
    <>
      <Box sx={{ p: embedded ? 0 : 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle1" component="h3" className="esti-label">Active logins</Typography>
            <StatusDot color="blue" label={STANDARD_LICENCE_LABEL} />
          </Stack>
          <Grid container spacing={2}>
            {seats.map((s) => (
              <Grid key={s.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" className="esti-label">{s.label}</Typography>
                  <Typography variant="body2">{s.used} active · Unlimited</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Box>

      {msg && (
        <Alert severity="success" onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ p: embedded ? 0 : 3, pt: embedded ? 2 : undefined }}>
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
      </Box>
    </>
  );

  return (
    <>
      {embedded ? (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="h6" component="h2" className="esti-grow">
                Users & access
              </Typography>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                Add staff login
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncIcon />}
                disabled={resync.isPending}
                onClick={() => resync.mutate()}
              >
                {resync.isPending ? "Syncing…" : "Resync identity types"}
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Owner / staff / portal logins. {AORMS_PORTALS.client.label} and{" "}
              {AORMS_PORTALS.consultant.label.toLowerCase()} logins are created from their records.
            </Typography>
            {body}
          </Stack>
        </Box>
      ) : (
        <RailLayout
          title="Users & access"
          description={`Owner / staff / portal logins. ${AORMS_PORTALS.client.label} and ${AORMS_PORTALS.consultant.label.toLowerCase()} logins are created from their records (Clients / Consultants).`}
        >
          {body}
        </RailLayout>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm" aria-labelledby="users-add-title">
        <DialogTitle id="users-add-title">Add staff login</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">Creates an office staff login at the chosen seniority tier.</Typography>
            <TextField
              id="u-name"
              label="Full name"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              helperText={
                form.fullName.length > 0 && form.fullName.trim().length < 2
                  ? "At least 2 characters."
                  : "Shown on ID cards and assignments."
              }
              error={form.fullName.length > 0 && form.fullName.trim().length < 2}
            />
            <TextField
              id="u-email"
              label="Login email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              helperText={!form.email.trim() ? "Required for sign-in." : undefined}
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
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              helperText={
                form.password.length > 0 && form.password.length < 8
                  ? "Use at least 8 characters."
                  : "They can change this after first login."
              }
              error={form.password.length > 0 && form.password.length < 8}
            />
            {createBlockedReason && !createStaff.isPending && (
              <Typography variant="caption" color="text.secondary">
                {createBlockedReason}
              </Typography>
            )}
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

      <Dialog open={reset !== null} onClose={() => setReset(null)} fullWidth maxWidth="sm" aria-labelledby="users-reset-title">
        <DialogTitle id="users-reset-title">Reset password — {reset?.email ?? ""}</DialogTitle>
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

      <Dialog open={link !== null} onClose={() => setLink(null)} fullWidth maxWidth="sm" aria-labelledby="users-link-title">
        <DialogTitle id="users-link-title">Link identity — {link?.email ?? ""}</DialogTitle>
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
    </>
  );
}
