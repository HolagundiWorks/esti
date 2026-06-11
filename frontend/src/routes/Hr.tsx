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
import { LEAVE_TYPES, type LeaveTypeCode, formatINR } from "@esti/contracts";
import { useState } from "react";
import { PayslipPdfCell } from "../components/PayslipPdfCell.js";
import { trpc } from "../lib/trpc.js";

const LEAVE_TAG: Record<string, "blue" | "green" | "red"> = {
  REQUESTED: "blue",
  APPROVED: "green",
  REJECTED: "red",
};
const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);
const thisMonth = () => new Date().toISOString().slice(0, 7);

export function Hr() {
  const utils = trpc.useUtils();
  const teamQ = trpc.team.list.useQuery();
  const leavesQ = trpc.leaves.list.useQuery();
  const payrollQ = trpc.payroll.list.useQuery();
  const team = (teamQ.data ?? []).filter((m) => m.active);

  const setLeave = trpc.leaves.setStatus.useMutation({
    onSuccess: () => utils.leaves.list.invalidate(),
  });
  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => utils.payroll.list.invalidate(),
  });

  // Leave request modal
  const [lvOpen, setLvOpen] = useState(false);
  const [lv, setLv] = useState({
    teamMemberId: "",
    type: "CASUAL" as LeaveTypeCode,
    fromDate: "",
    toDate: "",
    days: "1",
    reason: "",
  });
  const createLeave = trpc.leaves.create.useMutation({
    onSuccess: () => {
      utils.leaves.list.invalidate();
      setLvOpen(false);
      setLv({
        teamMemberId: "",
        type: "CASUAL",
        fromDate: "",
        toDate: "",
        days: "1",
        reason: "",
      });
    },
  });

  // Payslip generate modal
  const [pyOpen, setPyOpen] = useState(false);
  const [py, setPy] = useState({
    teamMemberId: "",
    month: thisMonth(),
    gross: "",
    deductions: "",
  });
  const generate = trpc.payroll.generate.useMutation({
    onSuccess: () => {
      utils.payroll.list.invalidate();
      setPyOpen(false);
      setPy({
        teamMemberId: "",
        month: thisMonth(),
        gross: "",
        deductions: "",
      });
    },
  });

  return (
    <Stack gap={6}>
      <Stack gap={3}>
        <h1>HR</h1>
        <p>Leave requests and payslip management for your team.</p>
      </Stack>

      {/* Leaves */}
      <Stack orientation="horizontal" gap={5}>
        <h2 className="esti-grow">Leaves</h2>
        <Button
          size="sm"
          disabled={team.length === 0}
          onClick={() => setLvOpen(true)}
        >
          Request leave
        </Button>
      </Stack>
      <TableContainer title="Leave register">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Member</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>From</TableHeader>
              <TableHeader>To</TableHeader>
              <TableHeader>Days</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(leavesQ.data ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.name}</TableCell>
                <TableCell>
                  {LEAVE_TYPES[l.type as LeaveTypeCode] ?? l.type}
                </TableCell>
                <TableCell>{l.fromDate}</TableCell>
                <TableCell>{l.toDate}</TableCell>
                <TableCell>{l.days}</TableCell>
                <TableCell>
                  <Tag type={LEAVE_TAG[l.status] ?? "blue"}>{l.status}</Tag>
                </TableCell>
                <TableCell>
                  {l.status === "REQUESTED" && (
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() =>
                          setLeave.mutate({ id: l.id, status: "APPROVED" })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() =>
                          setLeave.mutate({ id: l.id, status: "REJECTED" })
                        }
                      >
                        Reject
                      </Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payroll */}
      <Stack orientation="horizontal" gap={5}>
        <h2 className="esti-grow">Payroll</h2>
        <Button
          size="sm"
          disabled={team.length === 0}
          onClick={() => setPyOpen(true)}
        >
          Generate payslip
        </Button>
      </Stack>
      <TableContainer
        title="Payslips"
        description="Monthly salary — net of deductions"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Member</TableHeader>
              <TableHeader>Month</TableHeader>
              <TableHeader>Gross</TableHeader>
              <TableHeader>Deductions</TableHeader>
              <TableHeader>Net</TableHeader>
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
                <TableCell>
                  {formatINR(p.grossPaise, { paise: false })}
                </TableCell>
                <TableCell>
                  {formatINR(p.deductionsPaise, { paise: false })}
                </TableCell>
                <TableCell>{formatINR(p.netPaise, { paise: false })}</TableCell>
                <TableCell>
                  <Tag type={p.paid ? "green" : "gray"}>
                    {p.paid ? `Paid ${p.paidDate ?? ""}` : "Unpaid"}
                  </Tag>
                </TableCell>
                <TableCell>
                  {!p.paid && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => markPaid.mutate({ id: p.id })}
                    >
                      Mark paid
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <PayslipPdfCell
                    payslipId={p.id}
                    initialStatus={p.pdfStatus}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Leave modal */}
      <Modal
        open={lvOpen}
        modalHeading="Request leave"
        primaryButtonText={createLeave.isPending ? "Saving…" : "Submit"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !lv.teamMemberId ||
          !lv.fromDate ||
          !lv.toDate ||
          createLeave.isPending
        }
        onRequestClose={() => setLvOpen(false)}
        onRequestSubmit={() =>
          createLeave.mutate({
            teamMemberId: lv.teamMemberId,
            type: lv.type,
            fromDate: lv.fromDate,
            toDate: lv.toDate,
            days: Number(lv.days) || 1,
            reason: lv.reason || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="lv-m"
            labelText="Member"
            value={lv.teamMemberId}
            onChange={(e) =>
              setLv((f) => ({ ...f, teamMemberId: e.target.value }))
            }
          >
            <SelectItem value="" text="Select…" />
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <Select
            id="lv-t"
            labelText="Type"
            value={lv.type}
            onChange={(e) =>
              setLv((f) => ({ ...f, type: e.target.value as LeaveTypeCode }))
            }
          >
            {(Object.keys(LEAVE_TYPES) as LeaveTypeCode[]).map((k) => (
              <SelectItem key={k} value={k} text={LEAVE_TYPES[k]} />
            ))}
          </Select>
          <TextInput
            id="lv-f"
            labelText="From"
            type="date"
            value={lv.fromDate}
            onChange={(e) => setLv((f) => ({ ...f, fromDate: e.target.value }))}
          />
          <TextInput
            id="lv-to"
            labelText="To"
            type="date"
            value={lv.toDate}
            onChange={(e) => setLv((f) => ({ ...f, toDate: e.target.value }))}
          />
          <TextInput
            id="lv-d"
            labelText="Days"
            type="number"
            value={lv.days}
            onChange={(e) => setLv((f) => ({ ...f, days: e.target.value }))}
          />
          <TextInput
            id="lv-r"
            labelText="Reason (optional)"
            value={lv.reason}
            onChange={(e) => setLv((f) => ({ ...f, reason: e.target.value }))}
          />
        </Stack>
      </Modal>

      {/* Payslip modal */}
      <Modal
        open={pyOpen}
        modalHeading="Generate payslip"
        primaryButtonText={generate.isPending ? "Saving…" : "Generate"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !py.teamMemberId ||
          !/^\d{4}-\d{2}$/.test(py.month) ||
          generate.isPending
        }
        onRequestClose={() => setPyOpen(false)}
        onRequestSubmit={() =>
          generate.mutate({
            teamMemberId: py.teamMemberId,
            month: py.month,
            grossPaise: py.gross ? rupeesToPaise(py.gross) : undefined,
            deductionsPaise: py.deductions ? rupeesToPaise(py.deductions) : 0,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="py-m"
            labelText="Member"
            value={py.teamMemberId}
            onChange={(e) =>
              setPy((f) => ({ ...f, teamMemberId: e.target.value }))
            }
          >
            <SelectItem value="" text="Select…" />
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <TextInput
            id="py-mo"
            labelText="Month (YYYY-MM)"
            value={py.month}
            onChange={(e) => setPy((f) => ({ ...f, month: e.target.value }))}
          />
          <TextInput
            id="py-g"
            labelText="Gross (₹ — blank = member salary)"
            type="number"
            value={py.gross}
            onChange={(e) => setPy((f) => ({ ...f, gross: e.target.value }))}
          />
          <TextInput
            id="py-d"
            labelText="Deductions (₹)"
            type="number"
            value={py.deductions}
            onChange={(e) =>
              setPy((f) => ({ ...f, deductions: e.target.value }))
            }
          />
          {generate.error && <p>{generate.error.message}</p>}
        </Stack>
      </Modal>
    </Stack>
  );
}
