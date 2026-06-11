import {
  Button,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  CONTRACT_TYPE_LABEL,
  ContractStatus,
  ContractType,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<
  string,
  "gray" | "green" | "blue" | "magenta" | "red"
> = {
  DRAFT: "gray",
  ACTIVE: "green",
  ON_HOLD: "blue",
  COMPLETED: "magenta",
  TERMINATED: "red",
};

export function Contracts() {
  const utils = trpc.useUtils();
  const listQ = trpc.contracts.list.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const inv = () => utils.contracts.list.invalidate();
  const updateStatus = trpc.contracts.updateStatus.useMutation({
    onSuccess: inv,
  });
  const remove = trpc.contracts.remove.useMutation({ onSuccess: inv });

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    projectId: "",
    title: "",
    party: "",
    contractType: "CLIENT",
    value: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.contracts.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
      setF({
        projectId: "",
        title: "",
        party: "",
        contractType: "CLIENT",
        value: "",
        startDate: "",
        endDate: "",
        notes: "",
      });
    },
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1>Contracts</h1>
          <p>Agreements with clients, consultants and vendors.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New contract</Button>
      </div>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: "No contracts yet",
          description:
            "Register an agreement to track parties, value and term.",
          action: (
            <Button size="sm" onClick={() => setOpen(true)}>
              New contract
            </Button>
          ),
        }}
      >
        <TableContainer title="Contract register">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title / party</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Value</TableHeader>
                <TableHeader>Term</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.ref}</TableCell>
                  <TableCell>
                    {c.title}
                    <div>{c.party}</div>
                  </TableCell>
                  <TableCell>
                    {CONTRACT_TYPE_LABEL[
                      c.contractType as keyof typeof CONTRACT_TYPE_LABEL
                    ] ?? c.contractType}
                  </TableCell>
                  <TableCell>
                    {c.valuePaise
                      ? formatINR(c.valuePaise, { paise: false })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {c.startDate ?? "—"} → {c.endDate ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      id={`c-st-${c.id}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={c.status}
                      onChange={(e) =>
                        updateStatus.mutate({
                          id: c.id,
                          status: e.target
                            .value as (typeof ContractStatus.options)[number],
                        })
                      }
                    >
                      {ContractStatus.options.map((st) => (
                        <SelectItem key={st} value={st} text={st} />
                      ))}
                    </Select>
                    <Tag
                      type={STATUS_TAG[c.status] ?? "gray"}
                      size="sm"
                      style={{ marginLeft: 4 }}
                    >
                      {c.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setConfirmId(c.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Delete contract?"
        body="This permanently removes the contract record."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={open}
        modalHeading="New contract"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!f.title || !f.party || create.isPending}
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId: f.projectId || undefined,
            title: f.title,
            party: f.party,
            contractType:
              f.contractType as (typeof ContractType.options)[number],
            valuePaise: Math.round(Number(f.value || "0") * 100),
            startDate: f.startDate || undefined,
            endDate: f.endDate || undefined,
            notes: f.notes || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="ct-title"
            labelText="Title"
            value={f.title}
            onChange={set("title")}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="ct-party"
              labelText="Party"
              value={f.party}
              onChange={set("party")}
            />
            <Select
              id="ct-type"
              labelText="Type"
              value={f.contractType}
              onChange={set("contractType")}
            >
              {ContractType.options.map((t) => (
                <SelectItem key={t} value={t} text={CONTRACT_TYPE_LABEL[t]} />
              ))}
            </Select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="ct-val"
              labelText="Value (₹)"
              type="number"
              value={f.value}
              onChange={set("value")}
            />
            <TextInput
              id="ct-start"
              labelText="Start date"
              type="date"
              value={f.startDate}
              onChange={set("startDate")}
            />
            <TextInput
              id="ct-end"
              labelText="End date"
              type="date"
              value={f.endDate}
              onChange={set("endDate")}
            />
          </div>
          <Select
            id="ct-proj"
            labelText="Related project (optional)"
            value={f.projectId}
            onChange={set("projectId")}
          >
            <SelectItem value="" text="— none —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                text={`${p.ref} — ${p.title}`}
              />
            ))}
          </Select>
          <TextArea
            id="ct-notes"
            labelText="Notes (optional)"
            rows={3}
            value={f.notes}
            onChange={set("notes")}
          />
        </Stack>
      </Modal>
    </div>
  );
}
