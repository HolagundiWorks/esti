import {
  Alert,
  AlertTitle,
  Box,
  Button,
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
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import { PoStatus, formatINR, poLineAmountPaise } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { StatusDot } from "./StatusTag.js";

const PO_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  RECEIVED: "green",
  CANCELLED: "red",
};

type Line = {
  description: string;
  unit: string;
  qty: string;
  rate: string;
  specItemId: string;
};
const blankLine = (): Line => ({
  description: "",
  unit: "",
  qty: "1",
  rate: "",
  specItemId: "",
});

export function ProjectPurchaseOrders({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.purchaseOrders.listByProject.useQuery({ projectId });
  const specOptsQ = trpc.purchaseOrders.listSpecLineOptions.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const invalidate = () =>
    utils.purchaseOrders.listByProject.invalidate({ projectId });
  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: invalidate,
  });
  const remove = trpc.purchaseOrders.remove.useMutation({
    onSuccess: invalidate,
  });

  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState("");
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setVendor("");
      setTitle("");
      setLines([blankLine()]);
    },
  });

  const setLine = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const linkSpecLine = (i: number, specItemId: string) => {
    const opt = specOptsQ.data?.find((o) => o.specItemId === specItemId);
    setLines((ls) =>
      ls.map((l, idx) =>
        idx === i
          ? {
              ...l,
              specItemId,
              description: opt
                ? [opt.item, opt.make].filter(Boolean).join(" — ")
                : l.description,
            }
          : l,
      ),
    );
  };
  const previewTotal = lines.reduce(
    (s, l) =>
      s +
      poLineAmountPaise(
        Number(l.qty || "0"),
        Math.round(Number(l.rate || "0") * 100),
      ),
    0,
  );
  const canSubmit =
    lines.some((l) => l.description.trim() || l.specItemId) && !create.isPending;

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" component="h3">Purchase orders</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpen(true)}>
          New PO
        </Button>
      </Box>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={5}
        empty={{
          title: "No purchase orders",
          description: "Raise a PO from project specifications or ad-hoc line items.",
        }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ref</TableCell>
                <TableCell>Vendor / title</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((po) => (
                <TableRow key={po.id}>
                  <TableCell>{po.ref}</TableCell>
                  <TableCell>
                    {po.vendor ?? "—"}
                    {po.title && <div>{po.title}</div>}
                  </TableCell>
                  <TableCell>
                    {formatINR(po.totalPaise, { paise: false })}
                  </TableCell>
                  <TableCell>
                    <TextField
                      id={`po-st-${po.id}`}
                      select
                      size="small"
                      aria-label="Status"
                      value={po.status}
                      onChange={(e) =>
                        updateStatus.mutate({
                          id: po.id,
                          status: e.target
                            .value as (typeof PoStatus.options)[number],
                        })
                      }
                    >
                      {PoStatus.options.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </TextField>
                    <StatusDot
                      color={PO_TAG[po.status] ?? "gray"}
                      label={po.status}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      color="error"
                      size="small"
                      onClick={() => setConfirmId(po.id)}
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
        heading="Delete purchase order?"
        body="This permanently removes the PO and its line items."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog aria-labelledby="project-purchase-orders-create-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="project-purchase-orders-create-title">New purchase order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                id="po-vendor"
                label="Vendor (optional)"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                fullWidth
              />
              <TextField
                id="po-title"
                label="Title / reference (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
              />
            </Box>

            {(specOptsQ.data?.length ?? 0) > 0 && (
              <Alert severity="info">
                <AlertTitle>Procurement from specifications</AlertTitle>
                Link lines to specification sheet rows from the Knowledge Bank catalogue.
              </Alert>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Specification</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Rate (₹)</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ minWidth: 220 }}>
                      <TextField
                        id={`l-spec-${i}`}
                        select
                        size="small"
                        aria-label="Specification"
                        value={l.specItemId}
                        onChange={(e) => linkSpecLine(i, e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">— Ad hoc —</MenuItem>
                        {(specOptsQ.data ?? []).map((o) => (
                          <MenuItem key={o.specItemId} value={o.specItemId}>{o.label}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        id={`l-d-${i}`}
                        size="small"
                        aria-label="Description"
                        value={l.description}
                        onChange={(e) =>
                          setLine(i, "description", e.target.value)
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell sx={{ width: 90 }}>
                      <TextField
                        id={`l-u-${i}`}
                        size="small"
                        aria-label="Unit"
                        value={l.unit}
                        onChange={(e) => setLine(i, "unit", e.target.value)}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 90 }}>
                      <TextField
                        id={`l-q-${i}`}
                        size="small"
                        aria-label="Qty"
                        type="number"
                        value={l.qty}
                        onChange={(e) => setLine(i, "qty", e.target.value)}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 120 }}>
                      <TextField
                        id={`l-r-${i}`}
                        size="small"
                        aria-label="Rate (₹)"
                        type="number"
                        value={l.rate}
                        onChange={(e) => setLine(i, "rate", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      {formatINR(
                        poLineAmountPaise(
                          Number(l.qty || "0"),
                          Math.round(Number(l.rate || "0") * 100),
                        ),
                        { paise: false },
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="Remove line"
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((ls) => ls.filter((_, idx) => idx !== i))
                        }
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button
                variant="text"
                size="small"
                startIcon={<Add />}
                onClick={() => setLines((ls) => [...ls, blankLine()])}
              >
                Add line
              </Button>
              <strong>Total: {formatINR(previewTotal, { paise: false })}</strong>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSubmit}
            onClick={() =>
              create.mutate({
                projectId,
                vendor: vendor || undefined,
                title: title || undefined,
                items: lines
                  .filter((l) => l.description.trim() || l.specItemId)
                  .map((l) => {
                    const opt = specOptsQ.data?.find((o) => o.specItemId === l.specItemId);
                    return {
                      description: l.description,
                      unit: l.unit || undefined,
                      qty: Number(l.qty || "0"),
                      ratePaise: Math.round(Number(l.rate || "0") * 100),
                      specItemId: l.specItemId || undefined,
                      catalogItemId: opt?.catalogItemId ?? undefined,
                    };
                  }),
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
