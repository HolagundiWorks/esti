import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  GstSystem,
  INVOICE_STATUS_TAG,
  InvoiceStatus,
  SAC_CODES,
  can,
  computeGst,
  computeTds194j,
  formatINR,
} from "@esti/contracts";
import type { InvoiceStatus as InvoiceStatusT, PeriodFilterInput } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { InvoicePdfCell } from "../components/InvoicePdfCell.js";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { PeriodFilter } from "../components/PeriodFilter.js";
import { StatusTag } from "../components/StatusTag.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

export function Invoices() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canInvoice = can(user?.role, "invoice:manage");
  const [period, setPeriod] = useState<PeriodFilterInput>({ preset: "CURRENT_FY" });
  const listQ = trpc.invoices.listAll.useQuery({ period });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const firmQ = trpc.firm.get.useQuery();
  const firmGst = (firmQ.data?.gstType ?? GstSystem.REGULAR) as GstSystem;
  const firmTdsDefault = firmQ.data?.tdsApplicableDefault ?? true;

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [taxableR, setTaxableR] = useState("");
  const [inter, setInter] = useState(false);
  const [isAdvance, setIsAdvance] = useState(false);
  const [sac, setSac] = useState<string>(SAC_CODES[0]?.code ?? "998321");

  const create = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.listAll.invalidate();
      utils.dashboard.home.invalidate();
      setOpen(false);
      setTaxableR("");
      setProjectId("");
      setIsAdvance(false);
    },
  });
  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoices.listAll.invalidate();
      utils.dashboard.home.invalidate();
    },
  });

  const taxablePaise = Math.round(Number(taxableR || "0") * 100);
  const breakup = computeGst(firmGst, taxablePaise, inter);
  const tdsPaise = firmTdsDefault ? computeTds194j(taxablePaise) : 0;
  const net = breakup.grandTotal - tdsPaise;
  const showSac = firmGst === GstSystem.REGULAR;

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 120 },
    {
      field: "project",
      headerName: "Project",
      flex: 1.4,
      minWidth: 200,
      sortable: false,
      valueGetter: (_v, row) => row.projectRef,
      renderCell: (p) => (
        <Stack spacing={0} sx={{ justifyContent: "center", height: 1 }}>
          <Link to={`/projects/${p.row.projectId}?tab=invoices`}>{p.row.projectRef}</Link>
          <Typography variant="caption" color="text.secondary">
            {p.row.projectTitle}
          </Typography>
        </Stack>
      ),
    },
    { field: "documentKind", headerName: "Document", flex: 1, minWidth: 140 },
    {
      field: "taxablePaise",
      headerName: "Taxable",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.taxablePaise, { paise: false }),
    },
    {
      field: "gstTotalPaise",
      headerName: "GST",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.gstTotalPaise, { paise: false }),
    },
    {
      field: "netReceivablePaise",
      headerName: "Net",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.netReceivablePaise, { paise: false }),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      renderCell: (iv) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
          <TextField
            id={`inv-st-${iv.row.id}`}
            select
            size="small"
            variant="standard"
            value={iv.row.status}
            disabled={
              !canInvoice ||
              iv.row.status === "PAID" ||
              iv.row.status === "CANCELLED"
            }
            onChange={(e) =>
              updateStatus.mutate({
                id: iv.row.id,
                status: e.target.value as (typeof InvoiceStatus.options)[number],
              })
            }
            sx={{ minWidth: 110 }}
            slotProps={{ htmlInput: { "aria-label": "Invoice status" } }}
          >
            {InvoiceStatus.options.map((st) => (
              <MenuItem key={st} value={st}>{st}</MenuItem>
            ))}
          </TextField>
          <StatusTag value={iv.row.status as InvoiceStatusT} map={INVOICE_STATUS_TAG} />
        </Stack>
      ),
    },
    {
      field: "document",
      headerName: "Document",
      flex: 1,
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: (iv) => (
        <InvoicePdfCell
          invoiceId={iv.row.id}
          initialStatus={iv.row.pdfStatus}
          canManage={canInvoice}
        />
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Invoices"
        description="GST tax invoices & bills of supply across all projects."
        actions={
          canInvoice ? (
            <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
              New invoice
            </Button>
          ) : undefined
        }
        aside={
          <Stack spacing={1.5}>
            <PeriodFilter value={period} onChange={setPeriod} />
          </Stack>
        }
      >
        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={8}
          empty={{
            title: "No invoices yet",
            description: "Raise an invoice against any project.",
            action: canInvoice ? (
              <Button variant="contained" size="small" onClick={() => setOpen(true)}>
                New invoice
              </Button>
            ) : undefined,
          }}
        >
          <DataGrid
            rows={listQ.data ?? []}
            columns={columns}
            density="compact"
            getRowHeight={() => "auto"}
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </DataState>
      </RailLayout>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New invoice (GST / TDS)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="gi-proj"
              select
              label="Project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <MenuItem value="">Select a project…</MenuItem>
              {(projectsQ.data ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{`${p.ref} — ${p.title}`}</MenuItem>
              ))}
            </TextField>
            <Typography variant="body2">
              GST system: <strong>{firmGst}</strong> (from Company settings)
            </Typography>
            <TextField
              id="gi-tax"
              label="Taxable value (₹)"
              type="number"
              value={taxableR}
              onChange={(e) => setTaxableR(e.target.value)}
            />
            {showSac && (
              <TextField
                id="gi-sac"
                select
                label="SAC code"
                value={sac}
                onChange={(e) => setSac(e.target.value)}
              >
                {SAC_CODES.map((s) => (
                  <MenuItem key={s.code} value={s.code}>{`${s.code} — ${s.label}`}</MenuItem>
                ))}
              </TextField>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  id="gi-inter"
                  checked={inter}
                  onChange={(e) => setInter(e.target.checked)}
                />
              }
              label="Inter-state (IGST)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  id="gi-advance"
                  checked={isAdvance}
                  onChange={(e) => setIsAdvance(e.target.checked)}
                />
              }
              label="Advance invoice (gates project activation when paid)"
            />
            <Typography variant="body2">
              TDS u/s 194J:{" "}
              <strong>{firmTdsDefault ? "deducted (10%)" : "not applicable"}</strong>{" "}
              (from Company settings)
            </Typography>
            {taxablePaise > 0 && (
              <Typography variant="body2">
                {breakup.documentKind} · GST {formatINR(breakup.gstTotal, { paise: false })} · TDS{" "}
                {formatINR(tdsPaise, { paise: false })} · Net{" "}
                <strong>{formatINR(net, { paise: false })}</strong>
              </Typography>
            )}
            {create.error && (
              <Alert severity="error">
                <strong>Could not create</strong> — {create.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!projectId || !taxableR || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                taxablePaise,
                interState: inter,
                isAdvance,
                sac: showSac ? sac : undefined,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
