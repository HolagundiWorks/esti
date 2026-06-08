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
  EMPLOYMENT_TYPES,
  type EmploymentTypeCode,
  TEAM_ROLES,
  type TeamRoleCode,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);

export function Team() {
  const utils = trpc.useUtils();
  const list = trpc.team.list.useQuery();
  const update = trpc.team.update.useMutation({ onSuccess: () => utils.team.list.invalidate() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "ARCHITECT" as TeamRoleCode,
    employmentType: "FULL_TIME" as EmploymentTypeCode,
    email: "",
    phone: "",
    salary: "",
    dateJoined: "",
  });
  const set =
    (k: keyof typeof form) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setOpen(false);
      setForm({
        name: "",
        role: "ARCHITECT",
        employmentType: "FULL_TIME",
        email: "",
        phone: "",
        salary: "",
        dateJoined: "",
      });
    },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Team</h1>
        <Button onClick={() => setOpen(true)}>New member</Button>
      </div>

      <TableContainer title="Staff register" description="Office team members and monthly salary">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Employment</TableHeader>
              <TableHeader>Monthly salary</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(list.data ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.name}
                  <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{m.email ?? m.phone ?? ""}</div>
                </TableCell>
                <TableCell>{TEAM_ROLES[m.role as TeamRoleCode] ?? m.role}</TableCell>
                <TableCell>
                  {EMPLOYMENT_TYPES[m.employmentType as EmploymentTypeCode] ?? m.employmentType}
                </TableCell>
                <TableCell>{formatINR(m.monthlySalaryPaise, { paise: false })}</TableCell>
                <TableCell>
                  <Tag type={m.active ? "green" : "gray"}>{m.active ? "Active" : "Inactive"}</Tag>
                </TableCell>
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: m.id, active: !m.active })}
                  >
                    {m.active ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="New team member"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.name || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            name: form.name,
            role: form.role,
            employmentType: form.employmentType,
            email: form.email || undefined,
            phone: form.phone || undefined,
            monthlySalaryPaise: form.salary ? rupeesToPaise(form.salary) : 0,
            dateJoined: form.dateJoined || null,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="tm-name" labelText="Name" value={form.name} onChange={set("name")} />
          <Select id="tm-role" labelText="Role" value={form.role} onChange={set("role")}>
            {(Object.keys(TEAM_ROLES) as TeamRoleCode[]).map((k) => (
              <SelectItem key={k} value={k} text={TEAM_ROLES[k]} />
            ))}
          </Select>
          <Select
            id="tm-emp"
            labelText="Employment type"
            value={form.employmentType}
            onChange={set("employmentType")}
          >
            {(Object.keys(EMPLOYMENT_TYPES) as EmploymentTypeCode[]).map((k) => (
              <SelectItem key={k} value={k} text={EMPLOYMENT_TYPES[k]} />
            ))}
          </Select>
          <TextInput
            id="tm-salary"
            labelText="Monthly salary (₹)"
            type="number"
            value={form.salary}
            onChange={set("salary")}
          />
          <TextInput
            id="tm-joined"
            labelText="Date joined (optional)"
            type="date"
            value={form.dateJoined}
            onChange={set("dateJoined")}
          />
          <TextInput
            id="tm-email"
            labelText="Email (optional)"
            type="email"
            value={form.email}
            onChange={set("email")}
          />
          <TextInput id="tm-phone" labelText="Phone (optional)" value={form.phone} onChange={set("phone")} />
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
    </div>
  );
}
