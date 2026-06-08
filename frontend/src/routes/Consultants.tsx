import {
  Button,
  DataTable,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TextInput,
} from "@carbon/react";
import { CONSULTANT_DISCIPLINES, type ConsultantDisciplineCode } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const HEADERS = [
  { key: "name", header: "Name" },
  { key: "discipline", header: "Discipline" },
  { key: "firm", header: "Firm" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "portal", header: "Portal" },
];

export function Consultants() {
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
  const set =
    (k: keyof typeof form) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.consultants.create.useMutation({
    onSuccess: () => {
      utils.consultants.list.invalidate();
      setOpen(false);
      setForm({ name: "", discipline: "STRUCTURAL", firm: "", email: "", phone: "" });
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
      discipline: CONSULTANT_DISCIPLINES[c.discipline as ConsultantDisciplineCode] ?? c.discipline,
      firm: c.firm ?? "—",
      email: c.email ?? "—",
      phone: c.phone ?? "—",
      portal: (
        <Button kind="ghost" size="sm" onClick={() => setLogin({ id: c.id, name: c.name })}>
          Create login
        </Button>
      ),
    })) ?? [];

  return (
    <div>
      {loginMsg && (
        <InlineNotification
          kind="success"
          title="Collaborator login"
          subtitle={loginMsg}
          lowContrast
          onCloseButtonClick={() => setLoginMsg(null)}
        />
      )}

      <DataState
        loading={list.isLoading}
        isEmpty={allRows.length === 0}
        columnCount={6}
        empty={{
          title: "No consultants yet",
          description: "Add discipline specialists the office engages on projects.",
          action: <Button size="sm" onClick={() => setOpen(true)}>New consultant</Button>,
        }}
      >
        <DataTable rows={allRows} headers={HEADERS} isSortable>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps, onInputChange }) => (
            <TableContainer
              title="Consultant register"
              description="Discipline specialists the office engages"
            >
              <TableToolbar>
                <TableToolbarContent>
                  <TableToolbarSearch
                    placeholder="Search consultants…"
                    persistent
                    onChange={onInputChange}
                  />
                  <Button onClick={() => setOpen(true)}>New consultant</Button>
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => {
                      const { key, ...rest } = getHeaderProps({ header });
                      return (
                        <TableHeader key={key} {...rest}>
                          {header.header}
                        </TableHeader>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const { key, ...rest } = getRowProps({ row });
                    return (
                      <TableRow key={key} {...rest}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </DataState>

      <Modal
        open={open}
        modalHeading="New consultant"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.name || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            name: form.name,
            discipline: form.discipline,
            firm: form.firm || undefined,
            email: form.email || undefined,
            phone: form.phone || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="co-name" labelText="Name" value={form.name} onChange={set("name")} />
          <Select id="co-disc" labelText="Discipline" value={form.discipline} onChange={set("discipline")}>
            {(Object.keys(CONSULTANT_DISCIPLINES) as ConsultantDisciplineCode[]).map((k) => (
              <SelectItem key={k} value={k} text={CONSULTANT_DISCIPLINES[k]} />
            ))}
          </Select>
          <TextInput id="co-firm" labelText="Firm (optional)" value={form.firm} onChange={set("firm")} />
          <TextInput
            id="co-email"
            labelText="Email (optional)"
            type="email"
            value={form.email}
            onChange={set("email")}
          />
          <TextInput id="co-phone" labelText="Phone (optional)" value={form.phone} onChange={set("phone")} />
          {create.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={create.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>

      <Modal
        open={!!login}
        modalHeading={`Create login — ${login?.name ?? ""}`}
        primaryButtonText={createLogin.isPending ? "Creating…" : "Create login"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !loginForm.email || loginForm.password.length < 8 || createLogin.isPending
        }
        onRequestClose={() => setLogin(null)}
        onRequestSubmit={() =>
          login && createLogin.mutate({ consultantId: login.id, ...loginForm })
        }
      >
        <Stack gap={5}>
          <p style={{ color: "var(--cds-text-secondary)" }}>
            Gives this consultant a project-scoped portal login (their engaged projects only).
          </p>
          <TextInput
            id="cl-email"
            labelText="Login email"
            type="email"
            value={loginForm.email}
            onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextInput
            id="cl-password"
            labelText="Temporary password (min 8 chars)"
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
          />
          {createLogin.error && (
            <InlineNotification
              kind="error"
              title="Could not create login"
              subtitle={createLogin.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
