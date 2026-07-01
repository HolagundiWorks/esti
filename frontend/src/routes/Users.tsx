import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  ProgressBar,
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
  Tile,
} from "@carbon/react";
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

  return (
    <Stack gap={6}>
      <PageHeader
        title="Users & access"
        description="Owner / staff / portal logins. Client and consultant portal logins are created from their records (Clients / Consultants)."
        actions={<Button onClick={() => setAddOpen(true)}>Add staff login</Button>}
      />

      <Tile>
        <Stack gap={4}>
          <Stack orientation="horizontal" gap={3}>
            <h3 className="esti-label">Seat usage</h3>
            <Tag type={plan === "LITE" ? "gray" : "blue"}>{PLAN_LABEL[plan]}</Tag>
          </Stack>
          <Grid narrow>
            {seats.map((s) => (
              <Column key={s.label} sm={4} md={2} lg={4}>
                {s.cap === null ? (
                  <Stack gap={2}>
                    <p className="esti-label">{s.label}</p>
                    <p>{s.used} active · Unlimited</p>
                  </Stack>
                ) : (
                  <ProgressBar
                    label={s.label}
                    helperText={`${s.used} / ${s.cap} seats`}
                    value={s.used}
                    max={s.cap}
                    status={s.used >= s.cap ? "error" : undefined}
                  />
                )}
              </Column>
            ))}
          </Grid>
        </Stack>
      </Tile>
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
              <TableHeader>Type</TableHeader>
              <TableHeader>Level</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>AORMS ID</TableHeader>
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
              const type = userType(u);
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>
                    <Tag type={TYPE_TAG_COLOR[type]} size="sm">
                      {USER_TYPE_LABEL[type]}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    {accessLabelForUser(u)}
                  </TableCell>
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
                        {roleOptions.map((r) => (
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
                  <TableCell>{u.accountPublicId ?? "—"}</TableCell>
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
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => {
                          setLink({ id: u.id, email: u.email });
                          setLinkVal(u.accountPublicId ?? "");
                        }}
                      >
                        Link ID
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
            {roleOptions.map((r) => (
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

      <Modal
        open={link !== null}
        modalHeading={`Link identity — ${link?.email ?? ""}`}
        primaryButtonText={linkIdentity.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        onRequestClose={() => setLink(null)}
        onRequestSubmit={() =>
          link &&
          linkIdentity.mutate({ id: link.id, accountPublicId: linkVal.trim() || null })
        }
      >
        <Stack gap={4}>
          <p>
            Link this firm login to a person&apos;s portable AORMS-U identity so their
            certifications and growth follow them. Leave blank to unlink.
          </p>
          <TextInput
            id="u-link"
            labelText="AORMS-U handle"
            placeholder="AORMS-U-2K4P9F"
            value={linkVal}
            onChange={(e) => setLinkVal(e.target.value)}
          />
          {linkIdentity.error && (
            <InlineNotification
              kind="error"
              title="Could not link"
              subtitle={linkIdentity.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>

    </Stack>
  );
}
