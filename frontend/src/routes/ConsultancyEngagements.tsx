import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import {
  CHECK_CATEGORY_LABEL,
  CONS_DELIVERABLE_STATUS_TAG,
  CONS_ENGAGEMENT_STATUS_TAG,
  CheckCategory,
  ConsEngagementStatus,
  DeliverableStatus,
  ENGAGEMENT_MODEL_LABEL,
  ENGINEERING_DISCIPLINE_LABEL,
  EngagementModel,
  EngineeringDiscipline,
  ISSUE_CLASS_LABEL,
  IssueClass,
} from "@esti/contracts";
import { useScreenActions, type DockAction } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const MODELS = EngagementModel.options;
const DISCIPLINES = EngineeringDiscipline.options;
const ISSUE_CLASSES = IssueClass.options;
const CHECK_CATEGORIES = CheckCategory.options;

/**
 * AORMS-Consultancy — Phase 0 "Living record" workspace (preview): engineering
 * engagements + the deliverable register. Register lifecycle only — the
 * originate→check→approve sign-off chain arrives with Phase 1.
 * Design: docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 */
export function ConsultancyEngagements() {
  const utils = trpc.useUtils();
  const listQ = trpc.consultancy.engagements.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailQ = trpc.consultancy.engagements.get.useQuery(
    { id: selectedId ?? "" },
    { enabled: !!selectedId },
  );

  const invalidate = () => {
    utils.consultancy.engagements.list.invalidate();
    if (selectedId) utils.consultancy.engagements.get.invalidate({ id: selectedId });
  };

  const createEngagement = trpc.consultancy.engagements.create.useMutation({
    meta: { errorTitle: "Couldn't create the engagement" },
    onSuccess: (row) => {
      invalidate();
      setSelectedId(row.id);
      setEngOpen(false);
    },
  });
  const updateEngagement = trpc.consultancy.engagements.update.useMutation({
    meta: { errorTitle: "Couldn't update the engagement" },
    onSuccess: invalidate,
  });
  const removeEngagement = trpc.consultancy.engagements.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the engagement" },
    onSuccess: () => {
      setSelectedId(null);
      invalidate();
    },
  });
  const createDeliverable = trpc.consultancy.deliverables.create.useMutation({
    meta: { errorTitle: "Couldn't add the deliverable" },
    onSuccess: () => {
      invalidate();
      setDelOpen(false);
    },
  });
  const updateDeliverable = trpc.consultancy.deliverables.update.useMutation({
    meta: { errorTitle: "Couldn't update the deliverable" },
    onSuccess: invalidate,
  });
  const removeDeliverable = trpc.consultancy.deliverables.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the deliverable" },
    onSuccess: invalidate,
  });

  // New-engagement dialog state.
  const [engOpen, setEngOpen] = useState(false);
  const [engTitle, setEngTitle] = useState("");
  const [engModel, setEngModel] = useState<EngagementModel>("FULL_DESIGN");
  const [engDiscipline, setEngDiscipline] = useState<EngineeringDiscipline>("STRUCTURAL");
  const [engStage, setEngStage] = useState("");
  const [engReliance, setEngReliance] = useState("");

  // New-deliverable dialog state.
  const [delOpen, setDelOpen] = useState(false);
  const [delCode, setDelCode] = useState("");
  const [delTitle, setDelTitle] = useState("");
  const [delDiscipline, setDelDiscipline] = useState<EngineeringDiscipline>("STRUCTURAL");
  const [delRevision, setDelRevision] = useState("A");
  const [delIssueClass, setDelIssueClass] = useState<IssueClass>("FOR_INFORMATION");
  const [delCheckCategory, setDelCheckCategory] = useState<CheckCategory>("CAT1");

  const anyDialogOpen = engOpen || delOpen;
  useScreenActions(
    anyDialogOpen
      ? []
      : ([
          {
            id: "cons-new-engagement",
            zone: "center",
            tone: "primary",
            label: "New engagement",
            icon: <AddIcon />,
            onClick: () => {
              setEngTitle("");
              setEngStage("");
              setEngReliance("");
              setEngOpen(true);
            },
          },
          ...(selectedId
            ? ([
                {
                  id: "cons-new-deliverable",
                  zone: "center",
                  label: "Add deliverable",
                  icon: <AddIcon />,
                  onClick: () => {
                    setDelCode("");
                    setDelTitle("");
                    setDelRevision("A");
                    setDelOpen(true);
                  },
                },
              ] satisfies DockAction[])
            : []),
        ] satisfies DockAction[]),
    [anyDialogOpen, selectedId],
  );

  const engagements = listQ.data ?? [];
  const detail = detailQ.data;

  return (
    <RailLayout
      title="Engagements"
      description="AORMS-Consultancy · Phase 0 living record (preview)"
    >
      <PageBreadcrumb items={[{ label: "Consultancy" }, { label: "Engagements" }]} />

      <Grid container spacing={2}>
        {/* Engagement list */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <DataState
            loading={listQ.isLoading}
            isEmpty={engagements.length === 0}
            columnCount={1}
            empty={{
              title: "No engagements",
              description:
                "Create the first engineering engagement — the living record every deliverable, query, and fee stage attaches to.",
            }}
          >
            <Stack spacing={0}>
              {engagements.map((e) => (
                <Box
                  key={e.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  aria-pressed={selectedId === e.id}
                  className="esti-fill"
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    p: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    borderLeft: 3,
                    borderLeftColor: selectedId === e.id ? "primary.main" : "transparent",
                  }}
                >
                  <Stack spacing={0.5}>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                      <Typography variant="subtitle2" component="h3" className="esti-grow">
                        {e.title}
                      </Typography>
                      <StatusTag
                        value={e.status as ConsEngagementStatus}
                        map={CONS_ENGAGEMENT_STATUS_TAG}
                      />
                    </Box>
                    <span className="esti-label esti-label--secondary">
                      {ENGAGEMENT_MODEL_LABEL[e.model as EngagementModel] ?? e.model} ·{" "}
                      {ENGINEERING_DISCIPLINE_LABEL[e.leadDiscipline as EngineeringDiscipline] ??
                        e.leadDiscipline}
                      {e.stage ? ` · ${e.stage}` : ""}
                    </span>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </DataState>
        </Grid>

        {/* Detail + deliverable register */}
        <Grid size={{ xs: 12, lg: 7 }}>
          {!selectedId || !detail ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Select an engagement to open its deliverable register.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                  <Stack spacing={0.5} className="esti-grow">
                    <Typography variant="h6" component="h2">
                      {detail.title}
                    </Typography>
                    <span className="esti-label esti-label--secondary">
                      {ENGAGEMENT_MODEL_LABEL[detail.model as EngagementModel] ?? detail.model} ·
                      lead:{" "}
                      {ENGINEERING_DISCIPLINE_LABEL[
                        detail.leadDiscipline as EngineeringDiscipline
                      ] ?? detail.leadDiscipline}
                      {detail.stage ? ` · ${detail.stage}` : ""}
                    </span>
                    {detail.relianceScope && (
                      <Typography variant="body2" color="text.secondary">
                        Reliance: {detail.relianceScope}
                      </Typography>
                    )}
                  </Stack>
                  <RowActionsMenu
                    actions={[
                      ...(detail.status !== "ON_HOLD"
                        ? [
                            {
                              label: "Put on hold",
                              onClick: () =>
                                updateEngagement.mutate({ id: detail.id, status: "ON_HOLD" }),
                            },
                          ]
                        : [
                            {
                              label: "Reactivate",
                              onClick: () =>
                                updateEngagement.mutate({ id: detail.id, status: "ACTIVE" }),
                            },
                          ]),
                      ...(detail.status !== "CLOSED"
                        ? [
                            {
                              label: "Close engagement",
                              onClick: () =>
                                updateEngagement.mutate({ id: detail.id, status: "CLOSED" }),
                            },
                          ]
                        : []),
                      {
                        label: "Delete",
                        danger: true,
                        disabled: removeEngagement.isPending,
                        onClick: () => removeEngagement.mutate({ id: detail.id }),
                      },
                    ]}
                  />
                </Stack>
              </Box>

              <TableContainer>
                <Table size="small" aria-label="Deliverable register">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Discipline</TableCell>
                      <TableCell>Rev</TableCell>
                      <TableCell>Issue class</TableCell>
                      <TableCell>Check</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.deliverables.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <span className="esti-label esti-label--secondary">
                            Empty register — add the first deliverable package.
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {detail.deliverables.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.code}</TableCell>
                        <TableCell>{d.title}</TableCell>
                        <TableCell>
                          {ENGINEERING_DISCIPLINE_LABEL[d.discipline as EngineeringDiscipline] ??
                            d.discipline}
                        </TableCell>
                        <TableCell>{d.revision}</TableCell>
                        <TableCell>
                          {ISSUE_CLASS_LABEL[d.issueClass as IssueClass] ?? d.issueClass}
                        </TableCell>
                        <TableCell>{d.checkCategory}</TableCell>
                        <TableCell>
                          <StatusTag
                            value={d.status as DeliverableStatus}
                            map={CONS_DELIVERABLE_STATUS_TAG}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <RowActionsMenu
                            actions={[
                              ...(d.status === "DRAFT"
                                ? [
                                    {
                                      label: "Mark issued",
                                      onClick: () =>
                                        updateDeliverable.mutate({ id: d.id, status: "ISSUED" }),
                                    },
                                  ]
                                : []),
                              ...(d.status === "ISSUED"
                                ? [
                                    {
                                      label: "Supersede",
                                      onClick: () =>
                                        updateDeliverable.mutate({
                                          id: d.id,
                                          status: "SUPERSEDED",
                                        }),
                                    },
                                  ]
                                : []),
                              ...(d.status !== "WITHDRAWN"
                                ? [
                                    {
                                      label: "Withdraw",
                                      onClick: () =>
                                        updateDeliverable.mutate({ id: d.id, status: "WITHDRAWN" }),
                                    },
                                  ]
                                : []),
                              {
                                label: "Delete",
                                danger: true,
                                disabled: removeDeliverable.isPending,
                                onClick: () => removeDeliverable.mutate({ id: d.id }),
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* New engagement */}
      <Dialog open={engOpen} onClose={() => setEngOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New engagement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-eng-title"
              label="Title"
              value={engTitle}
              onChange={(e) => setEngTitle(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-eng-model"
              select
              label="Engagement model"
              value={engModel}
              onChange={(e) => setEngModel(e.target.value as EngagementModel)}
            >
              {MODELS.map((m) => (
                <MenuItem key={m} value={m}>
                  {ENGAGEMENT_MODEL_LABEL[m]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-eng-discipline"
              select
              label="Lead discipline"
              value={engDiscipline}
              onChange={(e) => setEngDiscipline(e.target.value as EngineeringDiscipline)}
            >
              {DISCIPLINES.map((d) => (
                <MenuItem key={d} value={d}>
                  {ENGINEERING_DISCIPLINE_LABEL[d]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="cons-eng-stage"
              label="Work stage (optional)"
              placeholder="e.g. Detailed design"
              value={engStage}
              onChange={(e) => setEngStage(e.target.value)}
            />
            <TextField
              id="cons-eng-reliance"
              label="Reliance scope (optional)"
              placeholder="What downstream parties may rely on"
              value={engReliance}
              onChange={(e) => setEngReliance(e.target.value)}
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEngOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!engTitle.trim() || createEngagement.isPending}
            onClick={() =>
              createEngagement.mutate({
                title: engTitle.trim(),
                model: engModel,
                leadDiscipline: engDiscipline,
                stage: engStage.trim() || undefined,
                relianceScope: engReliance.trim() || undefined,
              })
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* New deliverable */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add deliverable</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cons-del-code"
              label="Register code"
              placeholder="e.g. STR-CAL-001"
              value={delCode}
              onChange={(e) => setDelCode(e.target.value)}
              autoFocus
            />
            <TextField
              id="cons-del-title"
              label="Title"
              value={delTitle}
              onChange={(e) => setDelTitle(e.target.value)}
            />
            <TextField
              id="cons-del-discipline"
              select
              label="Discipline"
              value={delDiscipline}
              onChange={(e) => setDelDiscipline(e.target.value as EngineeringDiscipline)}
            >
              {DISCIPLINES.map((d) => (
                <MenuItem key={d} value={d}>
                  {ENGINEERING_DISCIPLINE_LABEL[d]}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                id="cons-del-revision"
                label="Revision"
                value={delRevision}
                onChange={(e) => setDelRevision(e.target.value)}
                className="esti-input-sm"
              />
              <TextField
                id="cons-del-issue-class"
                select
                label="Issue class"
                value={delIssueClass}
                onChange={(e) => setDelIssueClass(e.target.value as IssueClass)}
                className="esti-grow"
              >
                {ISSUE_CLASSES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {ISSUE_CLASS_LABEL[c]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              id="cons-del-check"
              select
              label="Check category"
              value={delCheckCategory}
              onChange={(e) => setDelCheckCategory(e.target.value as CheckCategory)}
              helperText="Required check rigour — Phase 1 gates issue on the matching sign-off chain"
            >
              {CHECK_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {CHECK_CATEGORY_LABEL[c]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !delCode.trim() || !delTitle.trim() || !selectedId || createDeliverable.isPending
            }
            onClick={() =>
              selectedId &&
              createDeliverable.mutate({
                engagementId: selectedId,
                code: delCode.trim(),
                title: delTitle.trim(),
                discipline: delDiscipline,
                revision: delRevision.trim() || "A",
                issueClass: delIssueClass,
                checkCategory: delCheckCategory,
              })
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </RailLayout>
  );
}
