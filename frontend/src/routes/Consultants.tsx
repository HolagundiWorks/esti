import {
  Button,
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
  TextInput,
} from "@carbon/react";
import { CONSULTANT_DISCIPLINES, type ConsultantDisciplineCode } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Consultants</h1>
        <Button onClick={() => setOpen(true)}>New consultant</Button>
      </div>
      {loginMsg && (
        <InlineNotification
          kind="success"
          title="Collaborator login"
          subtitle={loginMsg}
          lowContrast
          onCloseButtonClick={() => setLoginMsg(null)}
        />
      )}

      <TableContainer title="Consultant register" description="Discipline specialists the office engages">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Discipline</TableHeader>
              <TableHeader>Firm</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Phone</TableHeader>
              <TableHeader>Portal</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(list.data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  {CONSULTANT_DISCIPLINES[c.discipline as ConsultantDisciplineCode] ?? c.discipline}
                </TableCell>
                <TableCell>{c.firm ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => setLogin({ id: c.id, name: c.name })}>
                    Create login
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          <p style={{ color: "#6f6f6f" }}>
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
