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
  Tag,
  TextInput,
} from "@carbon/react";
import {
  ASSIGNABLE_STAFF_ROLES,
  STAFF_ROLE_LABEL,
  isStaffRole,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const ROLE_LABEL: Record<string, string> = {
  ...STAFF_ROLE_LABEL,
  CONSULTANT: "Staff / Consultant",
  CLIENT: "Client",
};

export function Users() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.users.list.useQuery();
  const invalidate = () => utils.users.list.invalidate();

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

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={5}>
        <Stack gap={3} className="esti-grow">
          <h1>Users &amp; access</h1>
          <p>
            Owner / staff / portal logins. Client and consultant portal logins are
            created from their records (Clients / Consultants).
          </p>
        </Stack>
        <Button onClick={() => setAddOpen(true)}>Add staff login</Button>
      </Stack>
      {msg && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle={msg}
          lowContrast
          onCloseButtonClick={() => setMsg(null)}
        />
      )}

      <TableContainer title="Logins">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Email</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((u) => {
              const isSelf = u.id === user?.id;
              const scope =
                u.role === "CLIENT"
                  ? " (client portal)"
                  : u.consultantId
                    ? " (consultant portal)"
                    : "";
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>
                    {!isSelf &&
                    u.role !== "OWNER" &&
                    !u.clientId &&
                    !u.consultantId ? (
                      <Select
                        id={`role-${u.id}`}
                        labelText="User role"
                        hideLabel
                        size="sm"
                        value={isStaffRole(u.role) ? u.role : "ASSOCIATE"}
                        onChange={(e) =>
                          setRole.mutate({
                            id: u.id,
                            role: e.target
                              .value as (typeof ASSIGNABLE_STAFF_ROLES)[number],
                          })
                        }
                      >
                        {ASSIGNABLE_STAFF_ROLES.map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            text={STAFF_ROLE_LABEL[r]}
                          />
                        ))}
                      </Select>
                    ) : (
                      <>
                        {ROLE_LABEL[u.role] ?? u.role}
                        {scope}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tag type={u.disabled ? "red" : "green"}>
                      {u.disabled ? "Disabled" : "Active"}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setReset({ id: u.id, email: u.email })}
                      >
                        Reset password
                      </Button>
                      {!isSelf && (
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            setDisabled.mutate({
                              id: u.id,
                              disabled: !u.disabled,
                            })
                          }
                        >
                          {u.disabled ? "Enable" : "Disable"}
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={addOpen}
        modalHeading="Add staff login"
        primaryButtonText={createStaff.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !form.email ||
          form.fullName.length < 2 ||
          form.password.length < 8 ||
          createStaff.isPending
        }
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={() => createStaff.mutate(form)}
      >
        <Stack gap={5}>
          <p>Creates an office staff login at the chosen seniority tier.</p>
          <TextInput
            id="u-name"
            labelText="Full name"
            value={form.fullName}
            onChange={(e) =>
              setForm((f) => ({ ...f, fullName: e.target.value }))
            }
          />
          <TextInput
            id="u-email"
            labelText="Login email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Select
            id="u-role"
            labelText="Role (seniority tier)"
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                role: e.target.value as (typeof ASSIGNABLE_STAFF_ROLES)[number],
              }))
            }
          >
            {ASSIGNABLE_STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r} text={STAFF_ROLE_LABEL[r]} />
            ))}
          </Select>
          <TextInput
            id="u-pw"
            labelText="Temporary password (min 8 chars)"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
          {createStaff.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={createStaff.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>

      <Modal
        open={reset !== null}
        modalHeading={`Reset password — ${reset?.email ?? ""}`}
        primaryButtonText={resetPassword.isPending ? "Saving…" : "Reset"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={resetPw.length < 8 || resetPassword.isPending}
        onRequestClose={() => setReset(null)}
        onRequestSubmit={() =>
          reset && resetPassword.mutate({ id: reset.id, password: resetPw })
        }
      >
        <TextInput
          id="u-reset"
          labelText="New password (min 8 chars)"
          type="password"
          value={resetPw}
          onChange={(e) => setResetPw(e.target.value)}
        />
      </Modal>
    </Stack>
  );
}
