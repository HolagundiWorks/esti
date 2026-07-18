import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  COA_MIN_FEE_PCT,
  CoaWorkCategory,
  FEE_BASIS_LABEL,
  FEE_PROPOSAL_STATUS_LABEL,
  FEE_PROPOSAL_STATUS_TAG,
  FEE_PROPOSAL_TRANSITIONS,
  FeeProposalStatus,
  type FeeBasis,
  ProjectWorkType,
  coaMinimumFee,
  formatINR,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { FeeProposalPdfCell } from "../components/FeeProposalPdfCell.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

/** Office › Proposals — unified COA fee proposals + scope/agreements (one model). */
export function Proposals() {
  const utils = trpc.useUtils();
  const listQ = trpc.proposals.listAll.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const coaTplQ = trpc.documents.listTemplates.useQuery({ kind: "COA" });
  const scopeTplQ = trpc.documents.listTemplates.useQuery({ kind: "SCOPE" });

  const [open, setOpen] = useState(false);

  const setStatus = trpc.proposals.setStatus.useMutation({
    onSuccess: () => utils.proposals.listAll.invalidate(),
  });

  useScreenActions(
    open
      ? []
      : [
          {
            id: "new-proposal",
            zone: "center",
            tone: "primary",
            label: "New proposal",
            icon: <AddIcon />,
            onClick: () => setOpen(true),
          },
        ],
    [open],
  );

  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState<string>(
    Object.values(CoaWorkCategory)[0] as string,
  );
  const [workType, setWorkType] = useState<string>(ProjectWorkType.options[0] as string);
  const [feeBasis, setFeeBasis] = useState<FeeBasis>("COA_PERCENT");
  const [cost, setCost] = useState("");
  const [fee, setFee] = useState("");
  const [area, setArea] = useState("");
  const [rate, setRate] = useState("");
  const [docComm, setDocComm] = useState("10");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState("");

  const create = trpc.proposals.create.useMutation({
    meta: { errorTitle: "Couldn't create the proposal" },
    onSuccess: () => {
      utils.proposals.listAll.invalidate();
      setOpen(false);
      setProjectId("");
      setFeeBasis("COA_PERCENT");
      setCost("");
      setFee("");
      setArea("");
      setRate("");
      setOverride("");
      setScope("");
      setNotes("");
    },
  });

  const costPaise = Math.round(Number(cost || "0") * 100);
  const ratePaise = Math.round(Number(rate || "0") * 100);
  const areaNum = Number(area || "0");
  const feePaise =
    feeBasis === "PER_SQM"
      ? Math.round(areaNum * ratePaise)
      : Math.round(Number(fee || "0") * 100);
  const coaMin =
    costPaise > 0
      ? coaMinimumFee(category as keyof typeof COA_MIN_FEE_PCT, costPaise)
      : 0;
  const below =
    feePaise > 0 && coaMin > 0 && isBelowCoaMinimum(feePaise, coaMin);
  const createBlockedReason = !projectId
    ? "Choose a project."
    : feeBasis === "COA_PERCENT" && !cost
      ? "Enter cost of works for COA percentage basis."
      : feeBasis === "PER_SQM" && !(areaNum > 0 && ratePaise > 0)
        ? "Enter built-up area and rate per sq.m."
        : feePaise <= 0
          ? "Enter a fee amount."
          : below && !override
            ? "Add an override reason when quoting below the COA minimum."
            : null;

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
          <Link to={`/projects/${p.row.projectId}`}>{p.row.projectRef}</Link>
          <Typography variant="caption" color="text.secondary">
            {p.row.projectTitle}
          </Typography>
        </Stack>
      ),
    },
    { field: "workCategory", headerName: "Work category", flex: 1.2, minWidth: 160 },
    {
      field: "feePaise",
      headerName: "Fee",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => formatINR(p.row.feePaise, { paise: false }),
    },
    {
      field: "belowMinimum",
      headerName: "COA",
      flex: 0.9,
      minWidth: 130,
      sortable: false,
      renderCell: (p) =>
        p.row.belowMinimum ? (
          <StatusDot color="magenta" label="Below COA min" />
        ) : (
          <StatusDot color="green" label="OK" />
        ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.3,
      minWidth: 190,
      sortable: false,
      renderCell: (p) => (
        <Stack spacing={0.5} sx={{ justifyContent: "center", height: 1 }}>
          <TextField
            id={`fp-status-${p.row.id}`}
            select
            size="small"
            aria-label="Proposal status"
            value={p.row.status}
            onChange={(e) =>
              setStatus.mutate({
                id: p.row.id,
                status: e.target.value as FeeProposalStatus,
              })
            }
          >
            {[
              p.row.status as FeeProposalStatus,
              ...(FEE_PROPOSAL_TRANSITIONS[p.row.status as FeeProposalStatus] ?? []),
            ].map((s) => (
              <MenuItem key={s} value={s}>{FEE_PROPOSAL_STATUS_LABEL[s]}</MenuItem>
            ))}
          </TextField>
          <StatusDot
            color={FEE_PROPOSAL_STATUS_TAG[p.row.status as FeeProposalStatus]}
            label={FEE_PROPOSAL_STATUS_LABEL[p.row.status as FeeProposalStatus] ?? p.row.status}
          />
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
      renderCell: (p) => <FeeProposalPdfCell feeId={p.row.id} initialStatus={p.row.pdfStatus} />,
    },
  ];

  return (
    <>
      <RailLayout
        title="Proposals"
        description="COA fee proposals and scope agreements across all projects."
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Proposals" }]} />
        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={6}
          empty={{
            title: "No proposals",
            description: "Prepare a COA-benchmarked proposal for a project.",
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

      <Dialog aria-labelledby="proposals-create-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="proposals-create-title">New proposal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {((coaTplQ.data ?? []).length > 0 || (scopeTplQ.data ?? []).length > 0) && (
              <TextField
                id="fp-tpl"
                select
                label="Start from template (optional)"
                helperText="COA templates fill Notes; scope-of-work templates fill Scope."
                value=""
                onChange={(e) => {
                  const coa = (coaTplQ.data ?? []).find((x) => x.id === e.target.value);
                  if (coa) {
                    setNotes(coa.body);
                    return;
                  }
                  const sc = (scopeTplQ.data ?? []).find((x) => x.id === e.target.value);
                  if (sc) setScope(sc.body);
                }}
              >
                <MenuItem value="">— none —</MenuItem>
                {(coaTplQ.data ?? []).map((t) => (
                  <MenuItem key={t.id} value={t.id}>{`COA · ${t.title}`}</MenuItem>
                ))}
                {(scopeTplQ.data ?? []).map((t) => (
                  <MenuItem key={t.id} value={t.id}>{`Scope · ${t.title}`}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              id="fp-proj"
              select
              label="Project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              helperText={!projectId ? "Required — proposals are always tied to a project." : undefined}
            >
              <MenuItem value="">Select a project…</MenuItem>
              {(projectsQ.data ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{`${p.ref} — ${p.title}`}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                id="fp-cat"
                select
                label="Work category (COA)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{ flex: 1 }}
              >
                {Object.values(CoaWorkCategory).map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
              <TextField
                id="fp-wt"
                select
                label="Work type"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                sx={{ flex: 1 }}
              >
                {ProjectWorkType.options.map((w) => (
                  <MenuItem key={w} value={w}>{w}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              id="fp-basis"
              select
              label="Fee basis"
              value={feeBasis}
              onChange={(e) => setFeeBasis(e.target.value as FeeBasis)}
            >
              {Object.entries(FEE_BASIS_LABEL).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                id="fp-cost"
                label={
                  feeBasis === "COA_PERCENT"
                    ? "Cost of works (₹)"
                    : "Cost of works (₹, COA benchmark)"
                }
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                sx={{ flex: 1 }}
              />
              {feeBasis === "PER_SQM" ? (
                <>
                  <TextField
                    id="fp-area"
                    label="Built-up area (sq.m)"
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    id="fp-rate"
                    label="Rate (₹ / sq.m)"
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                </>
              ) : (
                <TextField
                  id="fp-fee"
                  label={feeBasis === "LUMPSUM" ? "Lumpsum fee (₹)" : "Professional fee (₹)"}
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  sx={{ flex: 1 }}
                />
              )}
              <TextField
                id="fp-dc"
                label="Doc & comm %"
                type="number"
                value={docComm}
                onChange={(e) => setDocComm(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Stack>
            {feeBasis === "PER_SQM" && feePaise > 0 && (
              <Typography variant="body2">Computed fee ≈ {formatINR(feePaise, { paise: false })}</Typography>
            )}
            {coaMin > 0 && (
              <Typography variant="body2">
                COA minimum ≈ {formatINR(coaMin, { paise: false })}
                {below ? " — quoted fee is below the COA minimum." : ""}
              </Typography>
            )}
            {below && (
              <TextField
                id="fp-or"
                label="Override reason (required below COA minimum)"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            )}
            <TextField
              id="fp-scope"
              label="Scope (optional)"
              multiline
              rows={3}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
            <TextField
              id="fp-notes"
              label="Notes (optional)"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {create.error && (
              <Alert severity="error">
                <strong>Could not create</strong> — {create.error.message}
              </Alert>
            )}
            {createBlockedReason && !create.isPending && (
              <Typography variant="caption" color="text.secondary">
                {createBlockedReason}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={Boolean(createBlockedReason) || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                workCategory: category as CoaWorkCategory,
                workType: workType as (typeof ProjectWorkType.options)[number],
                feeBasis,
                costOfWorksPaise: costPaise,
                feePaise,
                builtUpAreaSqm: feeBasis === "PER_SQM" ? areaNum : undefined,
                ratePerSqmPaise: feeBasis === "PER_SQM" ? ratePaise : undefined,
                docCommPct: Number(docComm || "10"),
                scope: scope || undefined,
                notes: notes || undefined,
                overrideReason: override || undefined,
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
