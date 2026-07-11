import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  CONSULTANT_DISCIPLINES,
  type ConsultantDisciplineCode,
  EngagementStatus,
  formatINR,
  parseRupeeInput,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 4,
        }}
      >
        <Typography variant="h6" component="h3">Consultants engaged</Typography>
        <Button
          size="small"
          variant="contained"
          disabled={consultants.length === 0}
          onClick={() => setOpen(true)}
        >
          Engage consultant
        </Button>
      </Box>
      {consultants.length === 0 && (
        <p>Add consultants in the Consultants register first.</p>
      )}
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" component="h4">
          Sub-consultant engagements
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Agreed fee, paid, and balance
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Consultant</TableCell>
                <TableCell>Discipline</TableCell>
                <TableCell>Agreed</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data?.rows ?? []).map((e) => {
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
                      <TextField
                        id={`eng-${e.id}`}
                        select
                        size="small"
                        slotProps={{ htmlInput: { "aria-label": "Engagement status" } }}
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
                          <MenuItem key={st} value={st}>
                            {st}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        disabled={pay.isPending || e.status === "CANCELLED"}
                        onClick={() => {
                          setPayId(e.id);
                          setPayAmt("");
                        }}
                      >
                        Record payment
                      </Button>
                      {balance <= 0 && e.agreedFeePaise > 0 && (
                        <StatusDot color="green" label="Settled" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog aria-labelledby="project-engagements-engage-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle id="project-engagements-engage-title">Engage a consultant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="eng-consultant"
              select
              label="Consultant"
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Select…</MenuItem>
              {consultants.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {`${c.name} — ${CONSULTANT_DISCIPLINES[c.discipline as ConsultantDisciplineCode] ?? c.discipline}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="eng-fee"
              label="Agreed fee (₹)"
              type="number"
              value={agreedFee}
              onChange={(e) => setAgreedFee(e.target.value)}
              fullWidth
            />
            <TextField
              id="eng-scope"
              label="Scope (optional)"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!consultantId || agreedFee === "" || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                consultantId,
                scope: scope || undefined,
                agreedFeePaise: parseRupeeInput(agreedFee),
              })
            }
          >
            {create.isPending ? "Saving…" : "Engage"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog aria-labelledby="project-engagements-payment-title" open={payId !== null} onClose={() => setPayId(null)} fullWidth maxWidth="xs">
        <DialogTitle id="project-engagements-payment-title">Record payment</DialogTitle>
        <DialogContent>
          <TextField
            id="eng-pay"
            label="Payment amount (₹)"
            type="number"
            value={payAmt}
            onChange={(e) => setPayAmt(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setPayId(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!payAmt || Number(payAmt) <= 0 || pay.isPending}
            onClick={() =>
              payId && pay.mutate({ id: payId, amountPaise: parseRupeeInput(payAmt) })
            }
          >
            {pay.isPending ? "Saving…" : "Record"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
