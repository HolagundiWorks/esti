import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { StatusDot } from "../../components/StatusTag.js";
import { trpc } from "../lib/trpc";

type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;
type Members = Awaited<ReturnType<typeof trpc.admin.orgs.members.query>>;

const STATUS_TAG: Record<string, string> = {
  ACTIVE: "green",
  INVITED: "teal",
  LEFT: "gray",
};

export default function OrgsTab() {
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [loginDomain, setLoginDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Member management for one org.
  const [manage, setManage] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Members>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  // Issue a portable certification to a member.
  const [certWho, setCertWho] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certNote, setCertNote] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; slug: string } | null>(
    null,
  );
  const [deleteSlug, setDeleteSlug] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    setOrgs(await trpc.admin.orgs.list.query());
  }
  useEffect(() => {
    void load();
  }, []);

  async function openMembers(org: { id: string; name: string }) {
    setManage(org);
    setMemberError(null);
    setInviteEmail("");
    setMembers(await trpc.admin.orgs.members.query({ orgId: org.id }));
  }

  async function reloadMembers() {
    if (manage) setMembers(await trpc.admin.orgs.members.query({ orgId: manage.id }));
  }

  async function setStatus(accountId: string, status: "ACTIVE" | "LEFT") {
    if (!manage) return;
    await trpc.admin.orgs.setMemberStatus.mutate({ orgId: manage.id, accountId, status });
    await reloadMembers();
  }

  async function invite() {
    if (!manage) return;
    setMemberError(null);
    try {
      await trpc.admin.orgs.inviteMember.mutate({ orgId: manage.id, email: inviteEmail });
      setInviteEmail("");
      await reloadMembers();
    } catch (e) {
      setMemberError((e as Error).message);
    }
  }

  async function issueCert() {
    setCertNote(null);
    if (!certWho || !certTitle) return;
    try {
      await trpc.admin.certifications.issue.mutate({
        accountPublicId: certWho,
        title: certTitle,
        issuer: certIssuer || undefined,
      });
      setCertTitle("");
      setCertIssuer("");
      setCertNote("Certification issued.");
    } catch (e) {
      setCertNote((e as Error).message);
    }
  }

  const certifiable = members.filter((m) => m.publicId);

  async function create() {
    setError(null);
    try {
      await trpc.admin.orgs.create.mutate({
        name,
        slug: slug || undefined,
        billingEmail: email || undefined,
        loginDomain: loginDomain || undefined,
      });
      setOpen(false);
      setName("");
      setSlug("");
      setEmail("");
      setLoginDomain("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeOrg() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await trpc.admin.orgs.remove.mutate({ orgId: deleteTarget.id, confirmSlug: deleteSlug });
      setDeleteTarget(null);
      setDeleteSlug("");
      if (manage?.id === deleteTarget.id) setManage(null);
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    }
  }

  const orgColumns: GridColDef<Orgs[number]>[] = [
    { field: "name", headerName: "Name", flex: 1.2, minWidth: 160 },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "loginDomain",
      headerName: "Login domain",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    { field: "slug", headerName: "Slug", flex: 1, minWidth: 120 },
    {
      field: "billingEmail",
      headerName: "Billing email",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "members",
      headerName: "Members",
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: (p) => (
        <Button
          variant="text"
          size="small"
          onClick={() => openMembers({ id: p.row.id, name: p.row.name })}
        >
          Manage
        </Button>
      ),
    },
    {
      field: "delete",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => (
        <Button
          variant="text"
          color="error"
          size="small"
          onClick={() => {
            setDeleteError(null);
            setDeleteSlug("");
            setDeleteTarget({ id: p.row.id, name: p.row.name, slug: p.row.slug });
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const memberColumns: GridColDef<Members[number]>[] = [
    { field: "email", headerName: "Email", flex: 1.4, minWidth: 180 },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    { field: "role", headerName: "Role", flex: 0.8, minWidth: 110 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={STATUS_TAG[p.row.status] ?? "gray"} label={p.row.status} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 180,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          {p.row.status !== "ACTIVE" && (
            <Button variant="text" size="small" onClick={() => setStatus(p.row.accountId, "ACTIVE")}>
              Approve
            </Button>
          )}
          {p.row.status !== "LEFT" && (
            <Button variant="text" size="small" onClick={() => setStatus(p.row.accountId, "LEFT")}>
              Remove
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Button variant="contained" onClick={() => setOpen(true)}>
          New organization
        </Button>
      </Box>

      <DataGrid
        rows={orgs}
        columns={orgColumns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />

      <Dialog aria-labelledby="orgs-tab-create-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="orgs-tab-create-title">New organization</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="org-name"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              id="org-slug"
              label="Slug (optional — derived from name)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              fullWidth
            />
            <TextField
              id="org-email"
              label="Billing email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              id="org-login-domain"
              label="Login domain (optional)"
              placeholder="acme.in"
              helperText="Lets members sign in by typing this domain at Step 1."
              value={loginDomain}
              onChange={(e) => setLoginDomain(e.target.value)}
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!name} onClick={create}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        aria-labelledby="orgs-tab-members-title"
        open={manage !== null}
        onClose={() => setManage(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle id="orgs-tab-members-title">{`Members — ${manage?.name ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DataGrid
              rows={members}
              columns={memberColumns}
              getRowId={(r) => r.accountId}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <TextField
                id="invite-email"
                label="Invite an existing account by email"
                placeholder="person@firm.in"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" disabled={!inviteEmail} onClick={invite} sx={{ mt: 1 }}>
                Invite
              </Button>
            </Stack>
            {memberError && (
              <Alert severity="error">
                {memberError === "account_not_found"
                  ? "No account with that email — they must sign up first."
                  : memberError}
              </Alert>
            )}

            <Stack spacing={1}>
              <Typography variant="subtitle2">Issue a certification</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <TextField
                  id="cert-who"
                  select
                  label="To member"
                  value={certWho}
                  onChange={(e) => setCertWho(e.target.value)}
                  sx={{ flex: 1, minWidth: 160 }}
                >
                  <MenuItem value="">Select a member…</MenuItem>
                  {certifiable.map((m) => (
                    <MenuItem key={m.accountId} value={m.publicId ?? ""}>
                      {m.email}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  id="cert-title"
                  label="Title"
                  placeholder="Registered Architect"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  id="cert-issuer"
                  label="Issuer (optional)"
                  placeholder="Council of Architecture"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  disabled={!certWho || !certTitle}
                  onClick={issueCert}
                  sx={{ mt: 1 }}
                >
                  Issue
                </Button>
              </Stack>
              {certNote && <Alert severity="info">{certNote}</Alert>}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setManage(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        aria-labelledby="orgs-tab-delete-title"
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="orgs-tab-delete-title">Delete organization</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Permanently delete <strong>{deleteTarget?.name}</strong> and revoke all licences,
              members, and API keys for this workspace. This cannot be undone.
            </Typography>
            <TextField
              id="delete-slug"
              label={`Type slug to confirm: ${deleteTarget?.slug ?? ""}`}
              value={deleteSlug}
              onChange={(e) => setDeleteSlug(e.target.value)}
              fullWidth
            />
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!deleteTarget || deleteSlug !== deleteTarget.slug}
            onClick={removeOrg}
          >
            Delete workspace
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
