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
  TextInput,
} from "@carbon/react";
import { ClientKind } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const headers = [
  { key: "name", header: "Name" },
  { key: "kind", header: "Type" },
  { key: "city", header: "City" },
  { key: "gstin", header: "GSTIN" },
  { key: "email", header: "Email" },
];

export function Clients() {
  const utils = trpc.useUtils();
  const list = trpc.clients.list.useQuery({ limit: 100, offset: 0 });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "INDIVIDUAL",
    gstin: "",
    city: "",
    email: "",
    phone: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setOpen(false);
      setForm({ name: "", kind: "INDIVIDUAL", gstin: "", city: "", email: "", phone: "" });
    },
  });

  const rows =
    list.data?.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      city: c.city ?? "—",
      gstin: c.gstin ?? "—",
      email: c.email ?? "—",
    })) ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Clients</h1>
        <Button onClick={() => setOpen(true)}>New client</Button>
      </div>

      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <TableContainer title="Clients" description="Clients and leads">
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

      <Modal
        open={open}
        modalHeading="New client"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.name || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            name: form.name,
            kind: form.kind as (typeof ClientKind.options)[number],
            gstin: form.gstin || undefined,
            city: form.city || undefined,
            email: form.email || undefined,
            phone: form.phone || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="c-name" labelText="Name" value={form.name} onChange={set("name")} />
          <Select id="c-kind" labelText="Type" value={form.kind} onChange={set("kind")}>
            {ClientKind.options.map((k) => (
              <SelectItem key={k} value={k} text={k} />
            ))}
          </Select>
          <TextInput
            id="c-gstin"
            labelText="GSTIN (optional)"
            value={form.gstin}
            onChange={set("gstin")}
          />
          <TextInput id="c-city" labelText="City" value={form.city} onChange={set("city")} />
          <TextInput
            id="c-email"
            labelText="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
          />
          <TextInput id="c-phone" labelText="Phone" value={form.phone} onChange={set("phone")} />
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
