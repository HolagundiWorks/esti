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
import { formatINR, parseRupeeInput } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { PayslipPdfCell } from "../components/PayslipPdfCell.js";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";

/** Finance › Payroll — monthly payslips (relocated from HR). */
export function Payroll() {
  const utils = trpc.useUtils();
  const { canSalary } = useCapabilities();
  const payrollQ = trpc.payroll.list.useQuery();
  const teamQ = trpc.team.list.useQuery();
  const team = teamQ.data ?? [];

  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => utils.payroll.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [py, setPy] = useState({ teamMemberId: "", month: "", gross: "", deductions: "" });
  const generate = trpc.payroll.generate.useMutation({
    onSuccess: () => {
      utils.payroll.list.invalidate();
      setOpen(false);
      setPy({ teamMemberId: "", month: "", gross: "", deductions: "" });
    },
  });

  return (
    <Stack gap={6}>
      <PageHeader
        title="Payroll"
        description="Monthly payslips — gross, deductions and net pay."
        actions={
          <Button disabled={team.length === 0} onClick={() => setOpen(true)}>
            Generate payslip
          </Button>
        }
      />

      <DataState
        loading={payrollQ.isLoading}
        isEmpty={(payrollQ.data ?? []).length === 0}
        columnCount={5}
        empty={{ title: "No payslips", description: "Generate a monthly payslip for a team member." }}
      >
        <TableContainer title="Payslips" description="Monthly salary — net of deductions">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Member</TableHeader>
                <TableHeader>Month</TableHeader>
                {canSalary && <TableHeader>Gross</TableHeader>}
                {canSalary && <TableHeader>Deductions</TableHeader>}
                {canSalary && <TableHeader>Net</TableHeader>}
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Slip</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(payrollQ.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.month}</TableCell>
                  {canSalary && <TableCell>{formatINR(p.grossPaise, { paise: false })}</TableCell>}
                  {canSalary && <TableCell>{formatINR(p.deductionsPaise, { paise: false })}</TableCell>}
                  {canSalary && <TableCell>{formatINR(p.netPaise, { paise: false })}</TableCell>}
                  <TableCell>
                    <Tag type={p.paid ? "green" : "gray"}>
                      {p.paid ? `Paid ${p.paidDate ?? ""}` : "Unpaid"}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    {!p.paid && (
                      <Button kind="ghost" size="sm" onClick={() => markPaid.mutate({ id: p.id })}>
                        Mark paid
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <PayslipPdfCell payslipId={p.id} initialStatus={p.pdfStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading="Generate payslip"
        primaryButtonText={generate.isPending ? "Generating…" : "Generate"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !py.teamMemberId || !/^\d{4}-\d{2}$/.test(py.month) || generate.isPending
        }
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          generate.mutate({
            teamMemberId: py.teamMemberId,
            month: py.month,
            grossPaise: py.gross ? parseRupeeInput(py.gross) : undefined,
            deductionsPaise: py.deductions ? parseRupeeInput(py.deductions) : 0,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="py-m"
            labelText="Member"
            value={py.teamMemberId}
            onChange={(e) => setPy((f) => ({ ...f, teamMemberId: e.target.value }))}
          >
            <SelectItem value="" text="Select…" />
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <TextInput
            id="py-month"
            labelText="Month (YYYY-MM)"
            placeholder="2026-06"
            value={py.month}
            onChange={(e) => setPy((f) => ({ ...f, month: e.target.value }))}
          />
          {canSalary && (
            <TextInput
              id="py-gross"
              labelText="Gross (₹) — defaults to monthly salary"
              value={py.gross}
              onChange={(e) => setPy((f) => ({ ...f, gross: e.target.value }))}
            />
          )}
          {canSalary && (
            <TextInput
              id="py-ded"
              labelText="Deductions (₹)"
              value={py.deductions}
              onChange={(e) => setPy((f) => ({ ...f, deductions: e.target.value }))}
            />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
