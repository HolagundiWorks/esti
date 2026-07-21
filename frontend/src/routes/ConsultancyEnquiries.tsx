import {
  Box,
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
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  CONS_ENQUIRY_STATUS_LABEL,
  CONS_ENQUIRY_STATUS_TAG,
  CONSULTANCY_TYPE_LABEL,
  ConsultancyType,
  ENGAGEMENT_MODEL_LABEL,
  ENGINEERING_DISCIPLINE_LABEL,
  EngagementModel,
  EngineeringDiscipline,
  type ConsEnquiryStatus,
} from "@esti/contracts";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const DISCIPLINES = EngineeringDiscipline.options;
const TYPES = ConsultancyType.options;
const MODELS = EngagementModel.options;

/**
 * AORMS-Consultancy SOP §2 — enquiry register + go/no-go before a job number.
 */
export function ConsultancyEnquiries() {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const listQ = trpc.consultancy.enquiries.list.useQuery();
  const invalidate = () => utils.consultancy.enquiries.list.invalidate();

  const [createOpen, setCreateOpen] = useState(false);
  const [scoreFor, setScoreFor] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    contactName: "",
    phone: "",
    email: "",
    source: "",
    siteLocation: "",
    consultancyType: "" as "" | ConsultancyType,
    leadDiscipline: "STRUCTURAL" as EngineeringDiscipline,
    model: "" as "" | EngagementModel,
    notes: "",
  });
  const [score, setScore] = useState({
    capacityFit: 3,
    feeAttractiveness: 3,
    risk: 3,
    strategicFit: 3,
    conflictCheckDone: false,
    decisionNote: "",
  });

  useScreenActions(
    createOpen || scoreFor
      ? []
      : [
          {
            id: "new-enquiry",
            zone: "center",
            tone: "primary",
            label: "New enquiry",
            icon: <AddIcon />,
            onClick: () => setCreateOpen(true),
          },
        ],
    [createOpen, scoreFor],
  );

  const create = trpc.consultancy.enquiries.create.useMutation({
    meta: { errorTitle: "Couldn't register the enquiry" },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setForm({
        title: "",
        clientName: "",
        contactName: "",
        phone: "",
        email: "",
        source: "",
        siteLocation: "",
        consultancyType: "",
        leadDiscipline: "STRUCTURAL",
        model: "",
        notes: "",
      });
    },
  });
  const setStatus = trpc.consultancy.enquiries.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update enquiry status" },
    onSuccess: invalidate,
  });
  const scoreMut = trpc.consultancy.enquiries.score.useMutation({
    meta: { errorTitle: "Couldn't save the scorecard" },
    onSuccess: () => {
      invalidate();
      setScoreFor(null);
    },
  });
  const decide = trpc.consultancy.enquiries.decide.useMutation({
    meta: { errorTitle: "Couldn't record the go/no-go decision" },
    onSuccess: invalidate,
  });
  const convert = trpc.consultancy.enquiries.convertToEngagement.useMutation({
    meta: { errorTitle: "Couldn't open the job" },
    onSuccess: (res) => {
      invalidate();
      utils.consultancy.engagements.list.invalidate();
      navigate(`/consultancy/engagements?id=${res.engagement.id}`);
    },
  });
  const remove = trpc.consultancy.enquiries.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the enquiry" },
    onSuccess: invalidate,
  });

  const rows = listQ.data ?? [];

  return (
    <RailLayout
      title="Enquiries"
      description="Register intake, score go/no-go, then open a job number on win."
      actions={
        <Stack spacing={1} sx={{ width: 1 }}>
          <Button component={RouterLink} to="/consultancy/enquiries" size="small" variant="contained" fullWidth>
            Enquiries
          </Button>
          <Button component={RouterLink} to="/consultancy/engagements" size="small" variant="outlined" fullWidth>
            Engagements
          </Button>
        </Stack>
      }
    >
      <PageBreadcrumb items={[{ label: "Consultancy" }, { label: "Enquiries" }]} />
      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        empty={{
          title: "No enquiries yet",
          description: "Capture verbal and written enquiries here before a job exists.",
        }}
      >
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {rows.map((e) => (
            <Box
              key={e.id}
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
                justifyContent: "space-between",
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="subtitle2" component="span">
                    {e.ref}
                  </Typography>
                  <StatusTag
                    value={e.status as ConsEnquiryStatus}
                    map={CONS_ENQUIRY_STATUS_TAG}
                    label={CONS_ENQUIRY_STATUS_LABEL[e.status as ConsEnquiryStatus] ?? e.status}
                  />
                </Stack>
                <Typography variant="body1">{e.title}</Typography>
                <span className="esti-label esti-label--secondary">
                  {e.clientName}
                  {e.siteLocation ? ` · ${e.siteLocation}` : ""}
                  {` · ${ENGINEERING_DISCIPLINE_LABEL[e.leadDiscipline as EngineeringDiscipline] ?? e.leadDiscipline}`}
                  {e.consultancyType
                    ? ` · ${CONSULTANCY_TYPE_LABEL[e.consultancyType as ConsultancyType] ?? e.consultancyType}`
                    : ""}
                </span>
                {e.capacityFit != null && (
                  <span className="esti-label esti-label--secondary">
                    Scorecard · capacity {e.capacityFit} · fee {e.feeAttractiveness} · risk{" "}
                    {e.risk} · strategic {e.strategicFit}
                    {e.conflictCheckDone ? " · conflict checked" : " · conflict pending"}
                  </span>
                )}
              </Stack>
              <RowActionsMenu
                actions={[
                  ...(e.status === "RECEIVED"
                    ? [
                        {
                          label: "Start review",
                          disabled: setStatus.isPending,
                          onClick: () => setStatus.mutate({ id: e.id, status: "UNDER_REVIEW" }),
                        },
                      ]
                    : []),
                  ...(["RECEIVED", "UNDER_REVIEW", "GO"].includes(e.status)
                    ? [
                        {
                          label: "Go/no-go scorecard",
                          onClick: () => {
                            setScore({
                              capacityFit: e.capacityFit ?? 3,
                              feeAttractiveness: e.feeAttractiveness ?? 3,
                              risk: e.risk ?? 3,
                              strategicFit: e.strategicFit ?? 3,
                              conflictCheckDone: e.conflictCheckDone,
                              decisionNote: e.decisionNote ?? "",
                            });
                            setScoreFor(e.id);
                          },
                        },
                      ]
                    : []),
                  ...(e.status === "UNDER_REVIEW" && e.capacityFit != null
                    ? [
                        {
                          label: "Decide: Go",
                          disabled: decide.isPending,
                          onClick: () => decide.mutate({ id: e.id, decision: "GO" }),
                        },
                        {
                          label: "Decide: No-go",
                          danger: true,
                          disabled: decide.isPending,
                          onClick: () => decide.mutate({ id: e.id, decision: "NO_GO" }),
                        },
                      ]
                    : []),
                  ...(e.status === "GO"
                    ? [
                        {
                          label: "Open job (allocate number)",
                          disabled: convert.isPending,
                          onClick: () => convert.mutate({ id: e.id }),
                        },
                      ]
                    : []),
                  ...(e.status === "WON" && e.convertedEngagementId
                    ? [
                        {
                          label: "Open engagement",
                          onClick: () =>
                            navigate(`/consultancy/engagements?id=${e.convertedEngagementId}`),
                        },
                      ]
                    : []),
                  ...(["RECEIVED", "UNDER_REVIEW", "GO"].includes(e.status)
                    ? [
                        {
                          label: "Mark lost",
                          danger: true,
                          disabled: setStatus.isPending,
                          onClick: () => setStatus.mutate({ id: e.id, status: "LOST" }),
                        },
                      ]
                    : []),
                  {
                    label: "Delete",
                    danger: true,
                    disabled: remove.isPending || e.status === "WON",
                    onClick: () => remove.mutate({ id: e.id }),
                  },
                ]}
              />
            </Box>
          ))}
        </Stack>
      </DataState>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="cons-enquiry-create-title"
      >
        <DialogTitle id="cons-enquiry-create-title">Register enquiry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <TextField
              label="Client name"
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
            />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                label="Contact"
                fullWidth
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              />
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Box>
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              label="Site / location"
              value={form.siteLocation}
              onChange={(e) => setForm((f) => ({ ...f, siteLocation: e.target.value }))}
            />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                select
                label="Lead discipline"
                fullWidth
                value={form.leadDiscipline}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    leadDiscipline: e.target.value as EngineeringDiscipline,
                  }))
                }
              >
                {DISCIPLINES.map((d) => (
                  <MenuItem key={d} value={d}>
                    {ENGINEERING_DISCIPLINE_LABEL[d]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Consultancy type"
                fullWidth
                value={form.consultancyType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    consultancyType: e.target.value as "" | ConsultancyType,
                  }))
                }
              >
                <MenuItem value="">—</MenuItem>
                {TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {CONSULTANCY_TYPE_LABEL[t]}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              select
              label="Engagement model (optional)"
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value as "" | EngagementModel }))
              }
            >
              <MenuItem value="">—</MenuItem>
              {MODELS.map((m) => (
                <MenuItem key={m} value={m}>
                  {ENGAGEMENT_MODEL_LABEL[m]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Source"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!form.title.trim() || !form.clientName.trim() || create.isPending}
            onClick={() =>
              create.mutate({
                title: form.title.trim(),
                clientName: form.clientName.trim(),
                contactName: form.contactName.trim() || undefined,
                phone: form.phone.trim() || undefined,
                email: form.email.trim() || undefined,
                source: form.source.trim() || undefined,
                siteLocation: form.siteLocation.trim() || undefined,
                consultancyType: form.consultancyType || undefined,
                leadDiscipline: form.leadDiscipline,
                model: form.model || undefined,
                notes: form.notes.trim() || undefined,
              })
            }
          >
            {create.isPending ? "Saving…" : "Register"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!scoreFor}
        onClose={() => setScoreFor(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="cons-enquiry-score-title"
      >
        <DialogTitle id="cons-enquiry-score-title">Go/no-go scorecard</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(
              [
                ["capacityFit", "Capacity fit"],
                ["feeAttractiveness", "Fee attractiveness"],
                ["risk", "Risk (higher = worse)"],
                ["strategicFit", "Strategic fit"],
              ] as const
            ).map(([key, label]) => (
              <TextField
                key={key}
                select
                label={label}
                value={String(score[key])}
                onChange={(e) =>
                  setScore((s) => ({ ...s, [key]: Number(e.target.value) }))
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <MenuItem key={n} value={String(n)}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            ))}
            <FormControlLabel
              control={
                <Checkbox
                  checked={score.conflictCheckDone}
                  onChange={(e) =>
                    setScore((s) => ({ ...s, conflictCheckDone: e.target.checked }))
                  }
                />
              }
              label="Conflict-of-interest check done"
            />
            <TextField
              label="Decision note"
              multiline
              rows={2}
              value={score.decisionNote}
              onChange={(e) => setScore((s) => ({ ...s, decisionNote: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setScoreFor(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!scoreFor || scoreMut.isPending}
            onClick={() =>
              scoreFor &&
              scoreMut.mutate({
                id: scoreFor,
                capacityFit: score.capacityFit,
                feeAttractiveness: score.feeAttractiveness,
                risk: score.risk,
                strategicFit: score.strategicFit,
                conflictCheckDone: score.conflictCheckDone,
                decisionNote: score.decisionNote.trim() || undefined,
              })
            }
          >
            Save scorecard
          </Button>
        </DialogActions>
      </Dialog>
    </RailLayout>
  );
}
