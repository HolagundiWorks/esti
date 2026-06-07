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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Consultants</h1>
        <Button onClick={() => setOpen(true)}>New consultant</Button>
      </div>

      <TableContainer title="Consultant register" description="Discipline specialists the office engages">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Discipline</TableHeader>
              <TableHeader>Firm</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Phone</TableHeader>
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
    </div>
  );
}
