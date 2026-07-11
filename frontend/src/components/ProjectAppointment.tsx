import { Button, Stack, TextField } from "@mui/material";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

export function ProjectAppointment({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.appointments.byProject.useQuery({ projectId });
  const upsert = trpc.appointments.upsert.useMutation({
    meta: { errorTitle: "Couldn't save the appointment" },
    onSuccess: () => utils.appointments.byProject.invalidate({ projectId }),
  });
  const complete = trpc.appointments.complete.useMutation({
    meta: { errorTitle: "Couldn't complete the appointment" },
    onSuccess: () => utils.appointments.byProject.invalidate({ projectId }),
  });

  const row = q.data;
  const tagColor = row?.status === "COMPLETE" ? "green" : "blue";

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <h3>Phase 0 — Appointment</h3>
        <StatusDot color={tagColor} label={row?.status ?? "Not started"} />
      </Stack>
      <p style={{ margin: 0, opacity: 0.85 }}>
        Pre-engagement site visit, scope confirmation, and letter of appointment before full initiation.
      </p>
      <TextField
        id="appt-date"
        label="Site visit date"
        type="date"
        slotProps={{ inputLabel: { shrink: true } }}
        defaultValue={row?.siteVisitDate ?? ""}
        onBlur={(e) =>
          upsert.mutate({
            projectId,
            siteVisitDate: e.target.value || undefined,
            scopeSummary: row?.scopeSummary ?? undefined,
          })
        }
      />
      <TextField
        id="appt-scope"
        label="Scope summary"
        multiline
        minRows={4}
        defaultValue={row?.scopeSummary ?? ""}
        onBlur={(e) =>
          upsert.mutate({
            projectId,
            scopeSummary: e.target.value,
            siteVisitDate: row?.siteVisitDate ?? undefined,
          })
        }
      />
      <Stack direction="row" spacing={1}>
        <Button component={Link} to="/office/letters" variant="outlined" size="small">
          Draft letter of appointment
        </Button>
        <Button component={Link} to="/accounting/fees" variant="outlined" size="small">
          Fee proposal
        </Button>
        {row?.status !== "COMPLETE" && (
          <Button
            variant="contained"
            size="small"
            disabled={complete.isPending}
            onClick={() => complete.mutate({ projectId })}
          >
            Mark appointment complete
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
