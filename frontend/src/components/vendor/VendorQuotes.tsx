import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { canonicalUnit, formatINR, parseRateText } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { ConfirmModal } from "../ConfirmModal.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<string, "blue" | "green" | "red"> = {
  RECEIVED: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
};

type QuoteLine = { materialName: string; unit: string; rateRupees: number };

const today = () => new Date().toISOString().slice(0, 10);

export function VendorQuotes({ vendorId }: { vendorId: string }) {
  const utils = trpc.useUtils();
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // new-quote form
  const [header, setHeader] = useState({ ref: "", quoteDate: today(), notes: "" });
  const [raw, setRaw] = useState("");
  const [lines, setLines] = useState<QuoteLine[] | null>(null);

  const quotesQ = trpc.vendors.quotes.listByVendor.useQuery({ vendorId });
  const detailQ = trpc.vendors.quotes.byId.useQuery({ id: openId! }, { enabled: !!openId });

  const invalidate = () => {
    void quotesQ.refetch();
    void utils.vendors.pricesByVendor.invalidate({ vendorId });
  };
  const createM = trpc.vendors.quotes.create.useMutation({
    meta: { errorTitle: "Couldn't create the quote" },
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setHeader({ ref: "", quoteDate: today(), notes: "" });
      setRaw("");
      setLines(null);
    },
  });
  const acceptM = trpc.vendors.quotes.accept.useMutation({ meta: { errorTitle: "Couldn't accept the quote" }, onSuccess: invalidate });
  const rejectM = trpc.vendors.quotes.reject.useMutation({ meta: { errorTitle: "Couldn't reject the quote" }, onSuccess: invalidate });
  const removeM = trpc.vendors.quotes.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the quote" },
    onSuccess: () => { setOpenId(null); invalidate(); },
  });

  const quotes = quotesQ.data ?? [];

  function parse() {
    const res = parseRateText(raw, "material");
    setLines(
      res.rows
        .filter((r) => r.description.trim() !== "")
        .map((r) => ({
          materialName: r.description,
          unit: r.rawUnit ?? "",
          rateRupees: r.ratePaise == null ? 0 : r.ratePaise / 100,
        })),
    );
  }

  function setLine(i: number, patch: Partial<QuoteLine>) {
    setLines((ls) => (ls ? ls.map((l, j) => (j === i ? { ...l, ...patch } : l)) : ls));
  }

  function save() {
    const usable = (lines ?? []).filter((l) => l.materialName.trim() && l.unit.trim() && l.rateRupees > 0);
    if (usable.length === 0) return;
    createM.mutate({
      vendorId,
      ref: header.ref.trim(),
      quoteDate: header.quoteDate,
      notes: header.notes || undefined,
      lines: usable.map((l) => ({
        materialName: l.materialName.trim(),
        unit: canonicalUnit(l.unit) ?? l.unit.trim(),
        ratePaise: Math.round(l.rateRupees * 100),
      })),
    });
  }

  const usableLines = (lines ?? []).filter((l) => l.materialName.trim() && l.unit.trim() && l.rateRupees > 0).length;

  const quoteColumns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1 },
    { field: "quoteDate", headerName: "Date", width: 120 },
    { field: "lineCount", headerName: "Lines", width: 90 },
    {
      field: "totalPaise",
      headerName: "Total",
      width: 140,
      valueFormatter: (value: number) => formatINR(value),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <StatusDot color={STATUS_TAG[params.row.status as string] ?? "blue"} label={params.row.status} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 170,
      renderCell: (params) => {
        const q = params.row as { id: string; status: string };
        return (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              aria-label="View lines"
              title="View lines"
              onClick={() => setOpenId(openId === q.id ? null : q.id)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            {q.status === "RECEIVED" && (
              <>
                <IconButton
                  size="small"
                  aria-label="Accept → pricing history"
                  title="Accept → pricing history"
                  onClick={() => acceptM.mutate({ id: q.id })}
                  disabled={acceptM.isPending}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Reject"
                  title="Reject"
                  onClick={() => rejectM.mutate({ id: q.id })}
                  disabled={rejectM.isPending}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            )}
            <IconButton
              size="small"
              color="error"
              aria-label="Remove"
              title="Remove"
              onClick={() => setConfirmRemove(q.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      },
    },
  ];

  const lineColumns: GridColDef[] = [
    { field: "materialName", headerName: "Material", flex: 2 },
    { field: "unit", headerName: "Unit", width: 110 },
    {
      field: "ratePaise",
      headerName: "Rate",
      width: 140,
      valueFormatter: (value: number) => formatINR(value),
    },
  ];

  return (
    <Stack spacing={2}>
      <div className="esti-row-between">
        <Typography variant="subtitle1" component="h4">Quotations</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          New quote
        </Button>
      </div>

      <DataState
        loading={quotesQ.isLoading}
        isEmpty={!quotesQ.isLoading && quotes.length === 0}
        empty={{ title: "No quotations", description: "Record a quote received from this vendor; accept it to feed pricing history." }}
        columnCount={6}
      >
        <DataGrid
          rows={quotes}
          columns={quoteColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>

      {openId && detailQ.data && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" component="h5">{`${detailQ.data.ref} — lines`}</Typography>
          <DataGrid
            rows={detailQ.data.lines}
            columns={lineColumns}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
            getRowHeight={() => "auto"}
          />
        </Stack>
      )}

      {acceptM.data && acceptM.data.priced > 0 && (
        <Alert severity="success">
          Quote accepted — {acceptM.data.priced} price records added to pricing history.
        </Alert>
      )}

      {/* New quote modal — paste & parse */}
      <Dialog aria-labelledby="vendor-quotes-create-title" open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="vendor-quotes-create-title">New vendor quote</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                id="vq-ref"
                label="Quote ref"
                placeholder="Q-2026-014"
                value={header.ref}
                onChange={(e) => setHeader({ ...header, ref: e.target.value })}
                fullWidth
              />
              <TextField
                id="vq-date"
                label="Quote date"
                type="date"
                value={header.quoteDate}
                onChange={(e) => setHeader({ ...header, quoteDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
            <TextField
              id="vq-raw"
              label="Paste quote text"
              multiline
              minRows={6}
              placeholder={"1. OPC 53 cement   bag   420\n2. River sand   Cum   2400"}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              fullWidth
            />
            <Stack direction="row">
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutorenewIcon />}
                onClick={parse}
                disabled={raw.trim() === ""}
              >
                Parse lines
              </Button>
            </Stack>

            {lines && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">{`${usableLines} usable lines`}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>Unit → canonical</TableCell>
                      <TableCell>Rate (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((l, i) => {
                      const canon = canonicalUnit(l.unit);
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <TextField
                              id={`vql-d-${i}`}
                              size="small"
                              value={l.materialName}
                              onChange={(e) => setLine(i, { materialName: e.target.value })}
                              slotProps={{ htmlInput: { "aria-label": "Material" } }}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} className="esti-row">
                              <div className="esti-input-sm">
                                <TextField
                                  id={`vql-u-${i}`}
                                  size="small"
                                  value={l.unit}
                                  onChange={(e) => setLine(i, { unit: e.target.value })}
                                  slotProps={{ htmlInput: { "aria-label": "Unit" } }}
                                />
                              </div>
                              {l.unit.trim() !== "" && (
                                <StatusDot
                                  color={canon ? "green" : "red"}
                                  label={canon ?? "unknown"}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <div className="esti-input-sm">
                              <TextField
                                id={`vql-r-${i}`}
                                size="small"
                                type="number"
                                value={l.rateRupees}
                                onChange={(e) => setLine(i, { rateRupees: Number(e.target.value) })}
                                slotProps={{ htmlInput: { min: 0, step: 0.5, "aria-label": "Rate (₹)" } }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Stack>
            )}
            {createM.error && (
              <Alert severity="error">Could not save — {createM.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={createM.isPending || !header.ref || usableLines === 0}
            onClick={save}
          >
            {createM.isPending ? "Saving…" : `Save ${usableLines} lines`}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={!!confirmRemove} heading="Remove quote?" body="This deletes the quotation and its lines. Pricing history already recorded stays."
        confirmText="Remove" pending={removeM.isPending}
        onConfirm={() => { if (confirmRemove) removeM.mutate({ id: confirmRemove }); setConfirmRemove(null); }}
        onClose={() => setConfirmRemove(null)}
      />
    </Stack>
  );
}
