import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CONSULTANT_DISCIPLINES,
  type ConsultantDisciplineCode,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { trpc } from "../lib/trpc.js";

export function Consultants({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.consultants.list.useQuery();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    discipline: "STRUCTURAL" as ConsultantDisciplineCode,
    firm: "",
    email: "",
    phone: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.consultants.create.useMutation({
    onSuccess: () => {
      utils.consultants.list.invalidate();
      setOpen(false);
      setForm({
        name: "",
        discipline: "STRUCTURAL",
        firm: "",
        email: "",
        phone: "",
      });
    },
  });

  const [login, setLogin] = useState<{ id: string; name: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const createLogin = trpc.consultants.createLogin.useMutation({
    onSuccess: (u) => {
      setLoginMsg(`Collaborator login created for ${u.email}`);
      setLogin(null);
      setLoginForm({ email: "", password: "" });
    },
  });

  const allRows =
    list.data?.map((c) => ({
      id: c.id,
      name: c.name,
      discipline:
        CONSULTANT_DISCIPLINES[c.discipline as ConsultantDisciplineCode] ??
        c.discipline,
      firm: c.firm ?? "—",
      email: c.email ?? "—",
      phone: c.phone ?? "—",
    })) ?? [];

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allRows.filter((r) =>
        [r.name, r.discipline, r.firm, r.email, r.phone].some((v) =>
          String(v).toLowerCase().includes(q),
        ),
      )
    : allRows;

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1.2, minWidth: 160 },
    { field: "discipline", headerName: "Discipline", flex: 1, minWidth: 140 },
    { field: "firm", headerName: "Firm", flex: 1, minWidth: 140 },
    { field: "email", headerName: "Email", flex: 1.2, minWidth: 180 },
    { field: "phone", headerName: "Phone", flex: 1, minWidth: 130 },
    {
      field: "portal",
      headerName: "Portal",
      sortable: false,
      filterable: false,
      width: 140,
      renderCell: (p) => (
        <Button
          variant="text"
          size="small"
          onClick={() => setLogin({ id: p.row.id, name: p.row.name })}
        >
          Create login
        </Button>
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Consultants"
        description="Discipline specialists the office engages on projects."
        aside={
          <Stack spacing={1.5}>
            <TextField
              size="small"
              placeholder="Search consultants…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
            />
            <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
              New consultant
            </Button>
          </Stack>
        }
      >
      {loginMsg && (
        <Alert severity="success" onClose={() => setLoginMsg(null)}>
          {loginMsg}
        </Alert>
      )}

      <DataState
        loading={list.isLoading}
        isEmpty={allRows.length === 0}
        columnCount={6}
        empty={{
          title: "No consultants yet",
          description:
            "Add discipline specialists the office engages on projects.",
          action: (
            <Button variant="contained" onClick={() => setOpen(true)}>
              New consultant
            </Button>
          ),
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
      </RailLayout>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New consultant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="co-name"
              label="Name"
              value={form.name}
              onChange={set("name")}
            />
            <TextField
              id="co-disc"
              select
              label="Discipline"
              value={form.discipline}
              onChange={set("discipline")}
            >
              {(
                Object.keys(CONSULTANT_DISCIPLINES) as ConsultantDisciplineCode[]
              ).map((k) => (
                <MenuItem key={k} value={k}>
                  {CONSULTANT_DISCIPLINES[k]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="co-firm"
              label="Firm (optional)"
              value={form.firm}
              onChange={set("firm")}
            />
            <TextField
              id="co-email"
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
            <TextField
              id="co-phone"
              label="Phone (optional)"
              value={form.phone}
              onChange={set("phone")}
            />
            {create.error && (
              <Alert severity="error">{create.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!form.name || create.isPending}
            onClick={() =>
              create.mutate({
                name: form.name,
                discipline: form.discipline,
                firm: form.firm || undefined,
                email: form.email || undefined,
                phone: form.phone || undefined,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!login}
        onClose={() => setLogin(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{`Create login — ${login?.name ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <p>
              Gives this consultant a project-scoped portal login (their engaged
              projects only).
            </p>
            <TextField
              id="cl-email"
              label="Login email"
              type="email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <TextField
              id="cl-password"
              label="Temporary password (min 8 chars)"
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
            />
            {createLogin.error && (
              <Alert severity="error">{createLogin.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            color="inherit"
            onClick={() => setLogin(null)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !loginForm.email ||
              loginForm.password.length < 8 ||
              createLogin.isPending
            }
            onClick={() =>
              login &&
              createLogin.mutate({ consultantId: login.id, ...loginForm })
            }
          >
            {createLogin.isPending ? "Creating…" : "Create login"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
