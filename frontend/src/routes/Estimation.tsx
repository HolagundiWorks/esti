import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useMemo } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { RailLayout } from "../components/RailLayout.js";
import { DataState } from "../components/DataState.js";
import { EstimationBbsPanel } from "../components/estimation/EstimationBbsPanel.js";
import { EstimationBoqPanel } from "../components/estimation/EstimationBoqPanel.js";
import { EstimationMeasurePanel } from "../components/estimation/EstimationMeasurePanel.js";
import { EstimationProjectPicker } from "../components/estimation/EstimationProjectPicker.js";
import { StructureModelPanel } from "../components/estimation/StructureModelPanel.js";
import {
  ESTIMATION_PHASES,
  phaseFromParam,
  type EstimationPhase,
} from "../components/estimation/constants.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

function phaseIndex(phase: EstimationPhase): number {
  return ESTIMATION_PHASES.findIndex((p) => p.id === phase);
}

/** Project-scoped estimation workspace — model → measure → BOQ → BBS. */
export function EstimationWorkspace() {
  const { projectId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const phase = phaseFromParam(searchParams.get("phase"));
  const tab = phaseIndex(phase);

  const projectQ = trpc.projectOffice.byId.useQuery({ id: projectId }, { enabled: !!projectId });
  const workflowQ = trpc.cms.workflow.get.useQuery({ projectId }, { enabled: !!projectId });
  const modelComplete = workflowQ.data?.modelComplete ?? false;

  const lockedPhases = useMemo(
    () => new Set<EstimationPhase>(modelComplete ? [] : ["measure", "boq", "bbs"]),
    [modelComplete],
  );

  function setPhase(next: EstimationPhase) {
    if (lockedPhases.has(next)) return;
    const params = new URLSearchParams(searchParams);
    if (next === "model") params.delete("phase");
    else params.set("phase", next);
    setSearchParams(params, { replace: true });
  }

  if (!projectId) {
    return (
      <Alert severity="error">
        <AlertTitle>Missing project</AlertTitle>
        Choose a project from the estimation hub.
      </Alert>
    );
  }

  return (
    <RailLayout
      title="Estimation"
      description={projectQ.data?.title ?? "Loading project…"}
      aside={
        <Stack spacing={1.5}>
          <Button
            component={RouterLink}
            to="/estimation"
            variant="text"
            size="small"
            startIcon={<ArrowBack />}
          >
            All projects
          </Button>
          {projectQ.data?.ref && <StatusDot color="cool-gray" label={projectQ.data.ref} />}
          <Button
            component={RouterLink}
            to={`/projects/${projectId}?tab=estimation`}
            variant="outlined"
            size="small"
          >
            Project cost tabs
          </Button>
        </Stack>
      }
      tabs={
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_e, v) => setPhase(ESTIMATION_PHASES[v]!.id)}
          sx={{ borderRight: 1, borderColor: "divider" }}
        >
          {ESTIMATION_PHASES.map((p) => (
            <Tab
              key={p.id}
              label={p.label}
              disabled={lockedPhases.has(p.id)}
              sx={{ alignItems: "flex-start", textAlign: "left" }}
            />
          ))}
        </Tabs>
      }
    >
      {projectQ.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {projectQ.error.message}
        </Alert>
      )}
      <DataState
        loading={projectQ.isLoading}
        isEmpty={!projectQ.isLoading && !projectQ.data && !projectQ.error}
        empty={{
          title: "Project not found",
          description: "Return to the estimation hub and pick a live project.",
        }}
      >
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {ESTIMATION_PHASES[tab]?.detail}
          </Typography>

          {!modelComplete && phase !== "model" && (
            <Alert severity="warning">
              <AlertTitle>Complete the structure model first</AlertTitle>
              Map substructure, superstructure, and dependencies, then mark the model complete.
            </Alert>
          )}

          {phase === "model" && <StructureModelPanel projectId={projectId} />}
          {phase === "measure" && modelComplete && (
            <EstimationMeasurePanel projectId={projectId} />
          )}
          {phase === "boq" && modelComplete && <EstimationBoqPanel projectId={projectId} />}
          {phase === "bbs" && modelComplete && <EstimationBbsPanel projectId={projectId} />}
        </Stack>
      </DataState>
    </RailLayout>
  );
}

/** Estimation hub — project picker or workspace when `:projectId` is set. */
export function Estimation() {
  const { projectId } = useParams();
  if (projectId) return <EstimationWorkspace />;
  return <EstimationProjectPicker />;
}
