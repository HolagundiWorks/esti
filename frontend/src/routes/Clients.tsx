import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { ClientKind } from "@esti/contracts";
import type { ReactNode } from "react";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { pushToast } from "../lib/toast.js";
import { trpc } from "../lib/trpc.js";

const PAGE_SIZES = [10, 25, 50];

/** Status badge rendered over the Carbon `--cds-tag-*` token vars (exact colours). */
function TagChip({ color, label }: { color: string; label: ReactNode }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

export function Clients({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.clients.list.useQuery({ limit: 200, offset: 0 });
  const setDisabled = trpc.clients.setDisabled.useMutation({
    onSuccess: () => utils.clients.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "INDIVIDUAL",
    gstin: "",
    city: "",
    email: "",
    phone: "",
  });
  const nameMissing = !form.name.trim();
  const nameError = nameTouched && nameMissing;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setOpen(false);
      setNameTouched(false);
      setForm({
        name: "",
        kind: "INDIVIDUAL",
        gstin: "",
        city: "",
        email: "",
        phone: "",
      });
      pushToast({ kind: "success", title: "Client created" });
    },
  });

  const [portalOpen, setPortalOpen] = useState(false);
  const [portalForm, setPortalForm] = useState({
    clientId: "",
    email: "",
    password: "",
  });
  const [portalMsg, setPortalMsg] = useState<string | null>(null);
  const setP =
    (k: keyof typeof portalForm) => (e: { target: { value: string } }) =>
      setPortalForm((f) => ({ ...f, [k]: e.target.value }));
  const createPortal = trpc.clients.createPortalUser.useMutation({
    onSuccess: (u) => {
      setPortalMsg(`Portal login created for ${u.email}`);
      setPortalOpen(false);
      setPortalForm({ clientId: "", email: "", password: "" });
    },
  });

  const [search, setSearch] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: PAGE_SIZES[0] ?? 10,
  });

  const clients = list.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = q
    ? clients.filter((c) =>
        [
          c.name,
          c.kind,
          c.city ?? "—",
          c.gstin ?? "—",
          c.email ?? "—",
          c.disabled ? "Deactivated" : "Active",
        ].some((v) => String(v).toLowerCase().includes(q)),
      )
    : clients;

  useScreenActions(
    open || portalOpen
      ? []
      : [
          {
            id: "new-client",
            zone: "center",
            tone: "primary",
            label: "New client",
            icon: <AddIcon />,
            onClick: () => setOpen(true),
          },
          {
            id: "portal-login",
            zone: "right",
            label: "Portal login",
            onClick: () => setPortalOpen(true),
          },
        ],
    [open, portalOpen],
  );

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1.4, minWidth: 180 },
    { field: "kind", headerName: "Type", flex: 0.8, minWidth: 110 },
    { field: "city", headerName: "City", flex: 0.8, minWidth: 110, valueGetter: (v) => v ?? "—" },
    { field: "gstin", headerName: "GSTIN", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
    { field: "email", headerName: "Email", flex: 1.2, minWidth: 160, valueGetter: (v) => v ?? "—" },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      valueGetter: (_v, row) => (row.disabled ? "Deactivated" : "Active"),
      renderCell: (p) => (
        <TagChip
          color={p.row.disabled ? "gray" : "green"}
          label={p.row.disabled ? "Deactivated" : "Active"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "",
      flex: 0.8,
      minWidth: 130,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            {
              label: p.row.disabled ? "Activate" : "Deactivate",
              disabled: setDisabled.isPending,
              onClick: () =>
                setDisabled.mutate({ id: p.row.id, disabled: !p.row.disabled }),
            },
          ]}
        />
      ),
    },
  ];

  const searchField = (
    <TextField
      id="client-search"
      size="small"
      fullWidth
      placeholder="Search clients…"
      value={search}
      onChange={(e) => {
        setPaginationModel((m) => ({ ...m, page: 0 }));
        setSearch(e.target.value);
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );

  const grid = (
    <DataState
      loading={list.isLoading}
      isEmpty={clients.length === 0}
      columnCount={7}
      empty={{
        title: "No clients yet",
        description:
          "Add a client or lead to attach projects, invoices and a portal login.",
        ...(embedded
          ? {
              action: (
                <Button variant="contained" size="small" onClick={() => setOpen(true)}>
                  New client
                </Button>
              ),
            }
          : {}),
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        density="compact"
        disableRowSelectionOnClick
        autoHeight
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={PAGE_SIZES}
      />
    </DataState>
  );

  const dialogs = (
    <>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setNameTouched(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="c-name"
              label="Name"
              value={form.name}
              onChange={set("name")}
              onBlur={() => setNameTouched(true)}
              required
              autoComplete="organization"
              autoFocus
              error={nameError}
              helperText={nameError ? "Name is required" : undefined}
            />
            <TextField id="c-kind" select label="Type" value={form.kind} onChange={set("kind")} required>
              {ClientKind.options.map((k) => (
                <MenuItem key={k} value={k}>
                  {k}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="c-gstin"
              label="GSTIN (optional)"
              value={form.gstin}
              onChange={set("gstin")}
              autoComplete="off"
            />
            <TextField
              id="c-city"
              label="City"
              value={form.city}
              onChange={set("city")}
              autoComplete="address-level2"
            />
            <TextField
              id="c-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
            <TextField
              id="c-phone"
              label="Phone"
              value={form.phone}
              onChange={set("phone")}
              autoComplete="tel"
            />
            {create.error && (
              <Alert severity="error">
                <strong>Could not create</strong> — {create.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={() => {
              setOpen(false);
              setNameTouched(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={nameMissing || create.isPending}
            onClick={() => {
              setNameTouched(true);
              if (nameMissing) return;
              create.mutate({
                name: form.name.trim(),
                kind: form.kind as (typeof ClientKind.options)[number],
                gstin: form.gstin || undefined,
                city: form.city || undefined,
                email: form.email || undefined,
                phone: form.phone || undefined,
              });
            }}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={portalOpen} onClose={() => setPortalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create client portal login</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="pl-client"
              select
              label="Client"
              value={portalForm.clientId}
              onChange={setP("clientId")}
            >
              <MenuItem value="">Select…</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="pl-email"
              label="Login email"
              type="email"
              value={portalForm.email}
              onChange={setP("email")}
            />
            <TextField
              id="pl-password"
              label="Temporary password (min 8 chars)"
              type="password"
              value={portalForm.password}
              onChange={setP("password")}
            />
            {createPortal.error && (
              <Alert severity="error">
                <strong>Could not create login</strong> — {createPortal.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setPortalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !portalForm.clientId ||
              !portalForm.email ||
              portalForm.password.length < 8 ||
              createPortal.isPending
            }
            onClick={() => createPortal.mutate(portalForm)}
          >
            {createPortal.isPending ? "Creating…" : "Create login"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // Embedded (inside another screen) — flat, no rail/stage.
  if (embedded) {
    return (
      <Stack spacing={3}>
        {portalMsg && (
          <Alert severity="success" onClose={() => setPortalMsg(null)}>
            <strong>Portal login</strong> — {portalMsg}
          </Alert>
        )}
        <Stack spacing={2}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
            <Box sx={{ flex: 1, minWidth: 240 }}>{searchField}</Box>
          </Box>
          {grid}
        </Stack>
        {dialogs}
      </Stack>
    );
  }

  // Standalone route — the standard Rail / Stage shell.
  return (
    <>
      <RailLayout
        title="Clients"
        description="Clients and leads — attach projects, invoices and portal logins."
        aside={
          <Stack spacing={1.5}>
            {searchField}
            {portalMsg && (
              <Alert severity="success" onClose={() => setPortalMsg(null)}>
                {portalMsg}
              </Alert>
            )}
          </Stack>
        }
      >
        <PageBreadcrumb items={[{ label: "Clients" }]} />
        {grid}
      </RailLayout>
      {dialogs}
    </>
  );
}
