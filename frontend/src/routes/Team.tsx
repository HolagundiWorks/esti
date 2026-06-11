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
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const HEADERS = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role" },
  { key: "employmentType", header: "Employment" },
  { key: "salary", header: "Monthly salary" },
  { key: "status", header: "Status" },
  { key: "actions", header: "" },
];

const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);

export function Team() {
  const utils = trpc.useUtils();
  const list = trpc.team.list.useQuery();
  const update = trpc.team.update.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

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
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
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

  const allRows =
    list.data?.map((m) => ({
      id: m.id,
      name: m.name,
      _contact: m.email ?? m.phone ?? "",
      role: TEAM_ROLES[m.role as TeamRoleCode] ?? m.role,
      employmentType:
        EMPLOYMENT_TYPES[m.employmentType as EmploymentTypeCode] ??
        m.employmentType,
      salary: formatINR(m.monthlySalaryPaise, { paise: false }),
      status: m.active ? "Active" : "Inactive",
      _active: m.active,
      actions: m.active ? "Deactivate" : "Activate",
    })) ?? [];

  return (
    <div>
      <DataState
        loading={list.isLoading}
        isEmpty={allRows.length === 0}
        columnCount={6}
        empty={{
          title: "No team members yet",
          description:
            "Add staff to enable HR, payroll and project team tracking.",
          action: (
            <Button size="sm" onClick={() => setOpen(true)}>
              New member
            </Button>
          ),
        }}
      >
        <DataTable rows={allRows} headers={HEADERS} isSortable>
          {({
            rows,
            headers,
            getTableProps,
            getHeaderProps,
            getRowProps,
            onInputChange,
          }) => (
            <TableContainer
              title="Staff register"
              description="Office team members and monthly salary"
            >
              <TableToolbar>
                <TableToolbarContent>
                  <TableToolbarSearch
                    placeholder="Search team…"
                    persistent
                    onChange={onInputChange}
                  />
                  <Button onClick={() => setOpen(true)}>New member</Button>
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
                    const original = allRows.find((r) => r.id === row.id);
                    return (
                      <TableRow key={key} {...rest}>
                        {row.cells.map((cell) => {
                          if (cell.id.endsWith(":name")) {
                            return (
                              <TableCell key={cell.id}>
                                {cell.value}
                                {original?._contact && (
                                  <div>{original._contact}</div>
                                )}
                              </TableCell>
                            );
                          }
                          if (cell.id.endsWith(":status")) {
                            return (
                              <TableCell key={cell.id}>
                                <Tag
                                  type={original?._active ? "green" : "gray"}
                                >
                                  {cell.value}
                                </Tag>
                              </TableCell>
                            );
                          }
                          if (cell.id.endsWith(":actions")) {
                            return (
                              <TableCell key={cell.id}>
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  disabled={update.isPending}
                                  onClick={() =>
                                    original &&
                                    update.mutate({
                                      id: original.id,
                                      active: !original._active,
                                    })
                                  }
                                >
                                  {cell.value}
                                </Button>
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          );
                        })}
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
          <TextInput
            id="tm-name"
            labelText="Name"
            value={form.name}
            onChange={set("name")}
          />
          <Select
            id="tm-role"
            labelText="Role"
            value={form.role}
            onChange={set("role")}
          >
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
            {(Object.keys(EMPLOYMENT_TYPES) as EmploymentTypeCode[]).map(
              (k) => (
                <SelectItem key={k} value={k} text={EMPLOYMENT_TYPES[k]} />
              ),
            )}
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
          <TextInput
            id="tm-phone"
            labelText="Phone (optional)"
            value={form.phone}
            onChange={set("phone")}
          />
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
