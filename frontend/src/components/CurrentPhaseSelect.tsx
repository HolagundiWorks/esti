import { MenuItem, TextField } from "@mui/material";
import { trpc } from "../lib/trpc.js";

type PhaseRow = { id: string; label: string };

/** Single dropdown — sets current delivery stage; earlier stages are implicitly complete. */
export function CurrentPhaseSelect({
  projectId,
  phases,
  currentPhaseId,
  labelText = "Current stage",
  helperText = "Earlier stages are marked complete automatically.",
  id = "current-phase",
}: {
  projectId: string;
  phases: PhaseRow[];
  currentPhaseId: string | null | undefined;
  labelText?: string;
  helperText?: string;
  id?: string;
}) {
  const utils = trpc.useUtils();
  const setCurrent = trpc.phases.setCurrent.useMutation({
    onSuccess: () => {
      void utils.phases.listByProject.invalidate({ projectId });
      void utils.projectOffice.byId.invalidate({ id: projectId });
      void utils.projectOffice.list.invalidate();
      void utils.dashboard.home.invalidate();
    },
  });

  const value = currentPhaseId ?? phases[0]?.id ?? "";

  if (phases.length === 0) {
    return null;
  }

  return (
    <TextField
      id={id}
      select
      label={labelText}
      helperText={helperText}
      value={value}
      disabled={setCurrent.isPending}
      onChange={(e) => {
        const phaseId = e.target.value;
        if (phaseId && phaseId !== currentPhaseId) {
          setCurrent.mutate({ projectId, phaseId });
        }
      }}
      fullWidth
    >
      {phases.map((ph) => (
        <MenuItem key={ph.id} value={ph.id}>
          {ph.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
