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
  TextInput,
} from "@carbon/react";
import {
  CONSULTANT_DISCIPLINES,
  type ConsultantDisciplineCode,
  EngagementStatus,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);

export function ProjectEngagements({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.engagements.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const consultantsQ = trpc.consultants.list.useQuery();
  const invalidate = () =>
    utils.engagements.listByProject.invalidate({ projectId });

  const updateStatus = trpc.engagements.updateStatus.useMutation({
    onSuccess: invalidate,
  });
  const pay = trpc.engagements.recordPayment.useMutation({
    onSuccess: () => {
      invalidate();
      setPayId(null);
      setPayAmt("");
    },
  });

  const [open, setOpen] = useState(false);
  const [consultantId, setConsultantId] = useState("");
  const [agreedFee, setAgreedFee] = useState("");
  const [scope, setScope] = useState("");
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");

  const create = trpc.engagements.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setAgreedFee("");
      setScope("");
    },
  });

  const consultants = consultantsQ.data ?? [];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Consultants engaged</h3>
        <Button
          size="sm"
          disabled={consultants.length === 0}
          onClick={() => setOpen(true)}
        >
          Engage consultant
        </Button>
      </div>
      {consultants.length === 0 && (
        <p>Add consultants in the Consultants register first.</p>
      )}
      <TableContainer
        title="Sub-consultant engagements"
        description="Agreed fee, paid, and balance"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Consultant</TableHeader>
              <TableHeader>Discipline</TableHeader>
              <TableHeader>Agreed</TableHeader>
              <TableHeader>Paid</TableHeader>
              <TableHeader>Balance</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((e) => {
              const balance = e.agreedFeePaise - e.paidPaise;
              return (
                <TableRow key={e.id}>
                  <TableCell>{e.consultantName}</TableCell>
                  <TableCell>
                    {CONSULTANT_DISCIPLINES[
                      e.discipline as ConsultantDisciplineCode
                    ] ?? e.discipline}
                  </TableCell>
                  <TableCell>
                    {formatINR(e.agreedFeePaise, { paise: false })}
                  </TableCell>
                  <TableCell>
                    {formatINR(e.paidPaise, { paise: false })}
                  </TableCell>
                  <TableCell>{formatINR(balance, { paise: false })}</TableCell>
                  <TableCell>
                    <Select
                      id={`eng-${e.id}`}
                      labelText="Engagement status"
                      hideLabel
                      size="sm"
                      value={e.status}
                      onChange={(ev) =>
                        updateStatus.mutate({
                          id: e.id,
                          status: ev.target
                            .value as (typeof EngagementStatus.options)[number],
                        })
                      }
                    >
                      {EngagementStatus.options.map((st) => (
                        <SelectItem key={st} value={st} text={st} />
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      disabled={pay.isPending || e.status === "CANCELLED"}
                      onClick={() => {
                        setPayId(e.id);
                        setPayAmt("");
                      }}
                    >
                      Record payment
                    </Button>
                    {balance <= 0 && e.agreedFeePaise > 0 && (
                      <Tag type="green">Settled</Tag>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="Engage a consultant"
        primaryButtonText={create.isPending ? "Saving…" : "Engage"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !consultantId || agreedFee === "" || create.isPending
        }
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            consultantId,
            scope: scope || undefined,
            agreedFeePaise: rupeesToPaise(agreedFee),
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="eng-consultant"
            labelText="Consultant"
            value={consultantId}
            onChange={(e) => setConsultantId(e.target.value)}
          >
            <SelectItem value="" text="Select…" />
            {consultants.map((c) => (
              <SelectItem
                key={c.id}
                value={c.id}
                text={`${c.name} — ${CONSULTANT_DISCIPLINES[c.discipline as ConsultantDisciplineCode] ?? c.discipline}`}
              />
            ))}
          </Select>
          <TextInput
            id="eng-fee"
            labelText="Agreed fee (₹)"
            type="number"
            value={agreedFee}
            onChange={(e) => setAgreedFee(e.target.value)}
          />
          <TextInput
            id="eng-scope"
            labelText="Scope (optional)"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
        </Stack>
      </Modal>

      <Modal
        open={payId !== null}
        modalHeading="Record payment"
        primaryButtonText={pay.isPending ? "Saving…" : "Record"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!payAmt || Number(payAmt) <= 0 || pay.isPending}
        onRequestClose={() => setPayId(null)}
        onRequestSubmit={() =>
          payId && pay.mutate({ id: payId, amountPaise: rupeesToPaise(payAmt) })
        }
      >
        <TextInput
          id="eng-pay"
          labelText="Payment amount (₹)"
          type="number"
          value={payAmt}
          onChange={(e) => setPayAmt(e.target.value)}
        />
      </Modal>
    </>
  );
}
