import {
  Button,
  DataTable,
  InlineNotification,
  Modal,
  Pagination,
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
import { ClientKind } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const HEADERS = [
  { key: "name", header: "Name" },
  { key: "kind", header: "Type" },
  { key: "city", header: "City" },
  { key: "gstin", header: "GSTIN" },
  { key: "email", header: "Email" },
];

const PAGE_SIZES = [10, 25, 50];

export function Clients() {
  const utils = trpc.useUtils();
  const list = trpc.clients.list.useQuery({ limit: 200, offset: 0 });

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

  const [portalOpen, setPortalOpen] = useState(false);
  const [portalForm, setPortalForm] = useState({ clientId: "", email: "", password: "" });
  const [portalMsg, setPortalMsg] = useState<string | null>(null);
  const setP =
    (k: keyof typeof portalForm) =>
    (e: { target: { value: string } }) =>
      setPortalForm((f) => ({ ...f, [k]: e.target.value }));
  const createPortal = trpc.clients.createPortalUser.useMutation({
    onSuccess: (u) => {
      setPortalMsg(`Portal login created for ${u.email}`);
      setPortalOpen(false);
      setPortalForm({ clientId: "", email: "", password: "" });
    },
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0] ?? 10);

  const allRows =
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
      {portalMsg && (
        <InlineNotification
          kind="success"
          title="Portal login"
          subtitle={portalMsg}
          lowContrast
          onCloseButtonClick={() => setPortalMsg(null)}
        />
      )}

      <DataState
        loading={list.isLoading}
        isEmpty={allRows.length === 0}
        columnCount={5}
        empty={{
          title: "No clients yet",
          description: "Add a client or lead to attach projects, invoices and a portal login.",
          action: <Button size="sm" onClick={() => setOpen(true)}>New client</Button>,
        }}
      >
        <DataTable rows={allRows} headers={HEADERS} isSortable>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps, onInputChange }) => {
            const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
            return (
              <TableContainer title="Clients" description="Clients and leads">
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      placeholder="Search clients…"
                      persistent
                      onChange={(e) => { setPage(1); onInputChange(e); }}
                    />
                    <Button kind="tertiary" onClick={() => setPortalOpen(true)}>
                      Create portal login
                    </Button>
                    <Button onClick={() => setOpen(true)}>New client</Button>
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
                    {pagedRows.map((row) => {
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
                <Pagination
                  totalItems={rows.length}
                  pageSize={pageSize}
                  pageSizes={PAGE_SIZES}
                  page={page}
                  onChange={({ page: p, pageSize: ps }) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                />
              </TableContainer>
            );
          }}
        </DataTable>
      </DataState>

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

      <Modal
        open={portalOpen}
        modalHeading="Create client portal login"
        primaryButtonText={createPortal.isPending ? "Creating…" : "Create login"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !portalForm.clientId ||
          !portalForm.email ||
          portalForm.password.length < 8 ||
          createPortal.isPending
        }
        onRequestClose={() => setPortalOpen(false)}
        onRequestSubmit={() => createPortal.mutate(portalForm)}
      >
        <Stack gap={5}>
          <Select
            id="pl-client"
            labelText="Client"
            value={portalForm.clientId}
            onChange={setP("clientId")}
          >
            <SelectItem value="" text="Select…" />
            {(list.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id} text={c.name} />
            ))}
          </Select>
          <TextInput
            id="pl-email"
            labelText="Login email"
            type="email"
            value={portalForm.email}
            onChange={setP("email")}
          />
          <TextInput
            id="pl-password"
            labelText="Temporary password (min 8 chars)"
            type="password"
            value={portalForm.password}
            onChange={setP("password")}
          />
          {createPortal.error && (
            <InlineNotification
              kind="error"
              title="Could not create login"
              subtitle={createPortal.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </div>
  );
}
