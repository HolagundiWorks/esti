import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Check from "@mui/icons-material/Check";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import Pause from "@mui/icons-material/Pause";
import Send from "@mui/icons-material/Send";
import Verified from "@mui/icons-material/Verified";
import { can, formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import { useAuth } from "../../lib/auth.js";

const BILL_STATUS_TAG: Record<string, "gray" | "blue" | "green" | "warm-gray" | "red"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  CERTIFIED: "green",
  HELD: "warm-gray",
  REJECTED: "red",
};

// Preserve exact Carbon tag colours by rendering an MUI Chip over the
// `--cds-tag-*` token vars (still defined by the Carbon token layer).
const tagSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color}, var(--cds-layer-01))`,
  color: `var(--cds-tag-color-${color}, var(--cds-text-primary))`,
});

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

const EMPTY_BILL = {
  workOrderId: "",
  billNo: "",
  periodFrom: "",
  periodTo: "",
  remarks: "",
};

const EMPTY_LINE = { elementId: "", woItemId: "", claimedQty: 0 };

export function ProjectContractorBills({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addBillOpen, setAddBillOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [actionForm, setActionForm] = useState<{ billId: string; action: "certify" | "hold" | "reject"; remarks: string } | null>(null);
  const [billForm, setBillForm] = useState(EMPTY_BILL);
  const [lineForm, setLineForm] = useState(EMPTY_LINE);

  const billsQ = trpc.cms.bills.listByProject.useQuery({ projectId });
  const billDetailQ = trpc.cms.bills.byId.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );
  const workOrdersQ = trpc.cms.workOrders.listByProject.useQuery({ projectId });
  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });

  const woDetailQ = trpc.cms.workOrders.byId.useQuery(
    { id: billForm.workOrderId },
    { enabled: !!billForm.workOrderId && addLineOpen },
  );

  const canApprove = !!(user && can(user.role, "cost:approve"));

  const invalidate = () => {
    void billsQ.refetch();
    if (selectedId) void utils.cms.bills.byId.invalidate({ id: selectedId });
  };

  const createBillM = trpc.cms.bills.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddBillOpen(false);
      setBillForm(EMPTY_BILL);
    },
  });

  const addLineM = trpc.cms.bills.addLine.useMutation({
    onSuccess: () => {
      invalidate();
      setAddLineOpen(false);
      setLineForm(EMPTY_LINE);
    },
  });

  const submitM = trpc.cms.bills.submit.useMutation({ onSuccess: invalidate });
  const certifyM = trpc.cms.bills.certify.useMutation({
    onSuccess: () => { invalidate(); setActionForm(null); },
  });
  const holdM = trpc.cms.bills.hold.useMutation({
    onSuccess: () => { invalidate(); setActionForm(null); },
  });
  const rejectM = trpc.cms.bills.reject.useMutation({
    onSuccess: () => { invalidate(); setActionForm(null); },
  });
  const removeM = trpc.cms.bills.remove.useMutation({
    onSuccess: () => { setSelectedId(null); invalidate(); },
  });

  const bills = billsQ.data ?? [];
  const selectedBill = billDetailQ.data;
  const workOrders = (workOrdersQ.data ?? []).filter((w) => w.status !== "DRAFT");
  const elements = elementsQ.data?.elements ?? [];
  const woItems = woDetailQ.data?.items ?? [];

  function doAction(remarks: string) {
    if (!actionForm) return;
    const input = { id: actionForm.billId, remarks: remarks || undefined };
    if (actionForm.action === "certify") certifyM.mutate(input);
    else if (actionForm.action === "hold") holdM.mutate(input);
    else rejectM.mutate(input);
  }

  const billColumns: GridColDef[] = [
    { field: "billNo", headerName: "Bill No.", flex: 0.8, minWidth: 100 },
    {
      field: "contractorName",
      headerName: "Contractor",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.contractorName ?? "—",
    },
    {
      field: "period",
      headerName: "Period",
      flex: 1.2,
      minWidth: 190,
      sortable: false,
      valueGetter: (_v, row) => `${row.periodFrom} — ${row.periodTo}`,
    },
    {
      field: "claimedAmountPaise",
      headerName: "Claimed",
      flex: 0.9,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.claimedAmountPaise),
    },
    {
      field: "certifiedAmountPaise",
      headerName: "Certified",
      flex: 0.9,
      minWidth: 120,
      renderCell: (p) => (p.row.certifiedAmountPaise > 0 ? formatINR(p.row.certifiedAmountPaise) : "—"),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <Chip label={p.row.status} size="small" sx={tagSx(BILL_STATUS_TAG[p.row.status] ?? "gray")} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: (p) => {
        const b = p.row;
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", height: 1 }}>
            {b.status === "DRAFT" && (
              <IconButton
                size="small"
                aria-label="Submit"
                onClick={(e) => { e.stopPropagation(); submitM.mutate({ id: b.id }); }}
                disabled={submitM.isPending}
              >
                <Send fontSize="small" />
              </IconButton>
            )}
            {b.status === "SUBMITTED" && canApprove && (
              <>
                <IconButton
                  size="small"
                  aria-label="Certify"
                  onClick={(e) => { e.stopPropagation(); setActionForm({ billId: b.id, action: "certify", remarks: "" }); }}
                >
                  <Verified fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Hold"
                  onClick={(e) => { e.stopPropagation(); setActionForm({ billId: b.id, action: "hold", remarks: "" }); }}
                >
                  <Pause fontSize="small" />
                </IconButton>
              </>
            )}
            {b.status === "DRAFT" && (
              <IconButton
                size="small"
                color="error"
                aria-label="Remove"
                onClick={(e) => { e.stopPropagation(); removeM.mutate({ id: b.id }); }}
                disabled={removeM.isPending}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <div className="esti-row-between">
        <Typography variant="h6" component="h3">Contractor Bills</Typography>
        <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setAddBillOpen(true)}>
          New Bill
        </Button>
      </div>

      <DataState
        loading={billsQ.isLoading}
        isEmpty={!billsQ.isLoading && bills.length === 0}
        empty={{
          title: "No contractor bills",
          description: "Create a bill against a work order to begin the certification process.",
        }}
        columnCount={7}
      >
        <DataGrid
          rows={bills}
          columns={billColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          onRowClick={(params) => setSelectedId(selectedId === params.id ? null : (params.id as string))}
          getRowClassName={(params) => (params.id === selectedId ? "esti-cms-row-selected" : "")}
          sx={{
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .esti-cms-row-selected": { backgroundColor: "var(--cds-layer-selected)" },
          }}
        />
      </DataState>

      {selectedBill && (
        <Stack spacing={2}>
          <div className="esti-row-between">
            <Typography variant="subtitle1" component="h4">
              {selectedBill.billNo} — Line Items
            </Typography>
            {selectedBill.status === "DRAFT" && (
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setAddLineOpen(true)}>
                Add line
              </Button>
            )}
          </div>

          <DataState
            loading={billDetailQ.isLoading}
            isEmpty={!billDetailQ.isLoading && (selectedBill.lines?.length ?? 0) === 0}
            empty={{ title: "No lines", description: "Add line items to the bill." }}
            columnCount={7}
          >
            {/* Per-row certify-qty inputs — stays an MUI Table (not DataGrid). */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Element</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Claimed qty</TableCell>
                    <TableCell>Claimed amount</TableCell>
                    <TableCell>Certified qty</TableCell>
                    <TableCell>Certified amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedBill.lines ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.elementCode ?? "—"}</TableCell>
                      <TableCell>{line.woItemDescription ?? line.elementDescription ?? "—"}</TableCell>
                      <TableCell>{line.woItemUnit ?? "—"}</TableCell>
                      <TableCell>{formatINR(line.ratePaise)}</TableCell>
                      <TableCell>{line.claimedQty.toFixed(3)}</TableCell>
                      <TableCell>{formatINR(line.claimedAmountPaise)}</TableCell>
                      <TableCell>
                        {selectedBill.status === "SUBMITTED" && canApprove ? (
                          <CertifyQtyInput
                            lineId={line.id}
                            current={line.certifiedQty ?? line.claimedQty}
                            max={line.claimedQty}
                            onSaved={() => void utils.cms.bills.byId.invalidate({ id: selectedId! })}
                          />
                        ) : (
                          line.certifiedQty != null ? line.certifiedQty.toFixed(3) : "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {line.certifiedAmountPaise != null ? formatINR(line.certifiedAmountPaise) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        </Stack>
      )}

      {/* New Bill Dialog */}
      <Dialog open={addBillOpen} onClose={() => setAddBillOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Contractor Bill</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="bill-wo"
              select
              label="Work Order"
              value={billForm.workOrderId}
              onChange={(e) => setBillForm((f) => ({ ...f, workOrderId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Select issued work order…</MenuItem>
              {workOrders.map((w) => (
                <MenuItem key={w.id} value={w.id}>{`${w.ref} — ${w.contractorName ?? "Contractor"}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="bill-no"
              label="Bill No."
              placeholder="RA-01"
              value={billForm.billNo}
              onChange={(e) => setBillForm((f) => ({ ...f, billNo: e.target.value }))}
              fullWidth
            />
            <TextField
              id="bill-from"
              label="Period from"
              type="date"
              value={billForm.periodFrom}
              onChange={(e) => setBillForm((f) => ({ ...f, periodFrom: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              id="bill-to"
              label="Period to"
              type="date"
              value={billForm.periodTo}
              onChange={(e) => setBillForm((f) => ({ ...f, periodTo: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              id="bill-remarks"
              label="Remarks (optional)"
              value={billForm.remarks}
              onChange={(e) => setBillForm((f) => ({ ...f, remarks: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setAddBillOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              createBillM.isPending || !billForm.workOrderId || !billForm.billNo || !billForm.periodFrom || !billForm.periodTo
            }
            onClick={() =>
              createBillM.mutate({
                projectId,
                workOrderId: billForm.workOrderId,
                billNo: billForm.billNo,
                periodFrom: billForm.periodFrom,
                periodTo: billForm.periodTo,
                remarks: billForm.remarks || undefined,
              })
            }
          >
            {createBillM.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Line Dialog */}
      <Dialog open={addLineOpen} onClose={() => setAddLineOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Bill Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="line-element"
              select
              label="Element"
              value={lineForm.elementId}
              onChange={(e) => setLineForm((f) => ({ ...f, elementId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Select element…</MenuItem>
              {elements.map((el) => (
                <MenuItem key={el.id} value={el.id}>{`${el.code} — ${el.description}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="line-wo-item"
              select
              label="WO Line Item (rate source)"
              value={lineForm.woItemId}
              onChange={(e) => setLineForm((f) => ({ ...f, woItemId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Select WO item…</MenuItem>
              {woItems.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {`${item.description} (${item.unit}) — ${formatINR(item.agreedRatePaise)}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="line-qty"
              label="Claimed quantity"
              type="number"
              value={lineForm.claimedQty}
              onChange={(e) => setLineForm((f) => ({ ...f, claimedQty: Number(e.target.value) }))}
              slotProps={{ htmlInput: { min: 0, step: 0.001 } }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setAddLineOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={addLineM.isPending || !lineForm.elementId || !lineForm.woItemId || lineForm.claimedQty <= 0}
            onClick={() => {
              if (!selectedId) return;
              addLineM.mutate({
                billId: selectedId,
                elementId: lineForm.elementId,
                woItemId: lineForm.woItemId,
                claimedQty: lineForm.claimedQty,
              });
            }}
          >
            {addLineM.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog (certify / hold / reject) */}
      <Dialog open={!!actionForm} onClose={() => setActionForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {actionForm?.action === "certify"
            ? "Certify Bill"
            : actionForm?.action === "hold"
            ? "Hold Bill"
            : "Reject Bill"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {actionForm?.action === "certify" && (
              <Typography variant="body2" component="p">
                Ensure line-item certified quantities have been set. The bill's certified total will be
                computed from the line items.
              </Typography>
            )}
            <TextField
              id="action-remarks"
              label="Remarks (optional)"
              value={actionForm?.remarks ?? ""}
              onChange={(e) =>
                setActionForm((f) => f ? { ...f, remarks: e.target.value } : f)
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setActionForm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionForm?.action === "reject" ? "error" : "primary"}
            onClick={() => doAction(actionForm?.remarks ?? "")}
          >
            {certifyM.isPending || holdM.isPending || rejectM.isPending
              ? "Processing…"
              : actionForm?.action === "certify"
              ? "Certify"
              : actionForm?.action === "hold"
              ? "Hold"
              : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function CertifyQtyInput({
  lineId,
  current,
  max,
  onSaved,
}: {
  lineId: string;
  current: number;
  max: number;
  onSaved: () => void;
}) {
  const [val, setVal] = useState(current);
  const updateM = trpc.cms.bills.updateLine.useMutation({ onSuccess: onSaved });

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Box className="esti-input-sm">
        <TextField
          id={`cq-${lineId}`}
          type="number"
          size="small"
          hiddenLabel
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          slotProps={{ htmlInput: { min: 0, max, step: 0.001, "aria-label": "Certified quantity" } }}
        />
      </Box>
      <IconButton
        size="small"
        aria-label="Set certified qty"
        onClick={() => updateM.mutate({ id: lineId, certifiedQty: val })}
        disabled={updateM.isPending}
      >
        <Check fontSize="small" />
      </IconButton>
    </Stack>
  );
}
