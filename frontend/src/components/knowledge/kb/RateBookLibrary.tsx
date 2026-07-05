import {
  Button,
  InlineNotification,
  Modal,
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
import { Add, TrashCan } from "@carbon/icons-react";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../../lib/trpc.js";

function RateFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const create = trpc.kb.rateBook.create.useMutation({
    onSuccess: () => {
      void utils.kb.rateBook.list.invalidate();
      onClose();
    },
  });
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [rate, setRate] = useState("");

  const ratePaise = Math.round(parseFloat(rate || "0") * 100);
  const valid = code.trim() && description.trim() && unit.trim() && ratePaise >= 0;

  return (
    <Modal
      open={open}
      modalHeading="New rate-book entry"
      primaryButtonText={create.isPending ? "Saving…" : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={create.isPending || !valid}
      onRequestClose={onClose}
      onRequestSubmit={() =>
        create.mutate({ code: code.trim(), description: description.trim(), unit: unit.trim(), ratePaise })
      }
    >
      <Stack gap={5}>
        <TextInput id="rb-code" labelText="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <TextInput
          id="rb-desc"
          labelText="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextInput id="rb-unit" labelText="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <TextInput
          id="rb-rate"
          labelText="Rate (₹)"
          type="number"
          min={0}
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        {create.error && (
          <InlineNotification kind="error" lowContrast title="Error" subtitle={create.error.message} />
        )}
      </Stack>
    </Modal>
  );
}

/** Rate Book — the office schedule of rates (code · description · unit · rate). */
export function RateBookLibrary() {
  const utils = trpc.useUtils();
  const listQ = trpc.kb.rateBook.list.useQuery();
  const remove = trpc.kb.rateBook.remove.useMutation({
    onSuccess: () => void utils.kb.rateBook.list.invalidate(),
  });
  const [open, setOpen] = useState(false);

  return (
    <Stack gap={5}>
      <TableContainer
        title="Rate Book"
        description="Your office schedule of rates — code, description, unit and rate."
      >
        <Table size="md">
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>Rate</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell>{r.unit}</TableCell>
                <TableCell>{formatINR(r.ratePaise)}</TableCell>
                <TableCell>
                  <Button
                    kind="danger--ghost"
                    size="sm"
                    hasIconOnly
                    iconDescription="Delete"
                    renderIcon={TrashCan}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ id: r.id })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button renderIcon={Add} onClick={() => setOpen(true)}>
        New rate
      </Button>
      {open && <RateFormModal open onClose={() => setOpen(false)} />}
    </Stack>
  );
}
