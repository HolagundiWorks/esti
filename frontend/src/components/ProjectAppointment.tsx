import {
  Button,
  Stack,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

export function ProjectAppointment({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.appointments.byProject.useQuery({ projectId });
  const upsert = trpc.appointments.upsert.useMutation({
    onSuccess: () => utils.appointments.byProject.invalidate({ projectId }),
  });
  const complete = trpc.appointments.complete.useMutation({
    onSuccess: () => utils.appointments.byProject.invalidate({ projectId }),
  });

  const row = q.data;

  return (
    <Stack gap={4} style={{ marginTop: "var(--cds-spacing-05)" }}>
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
        <h3>Phase 0 — Appointment</h3>
        <Tag type={row?.status === "COMPLETE" ? "green" : "blue"} size="sm">
          {row?.status ?? "Not started"}
        </Tag>
      </Stack>
      <p style={{ margin: 0, opacity: 0.85 }}>
        Pre-engagement site visit, scope confirmation, and letter of appointment before full initiation.
      </p>
      <TextInput
        id="appt-date"
        labelText="Site visit date"
        type="date"
        defaultValue={row?.siteVisitDate ?? ""}
        onBlur={(e) =>
          upsert.mutate({
            projectId,
            siteVisitDate: e.target.value || undefined,
            scopeSummary: row?.scopeSummary ?? undefined,
          })
        }
      />
      <TextArea
        id="appt-scope"
        labelText="Scope summary"
        rows={4}
        defaultValue={row?.scopeSummary ?? ""}
        onBlur={(e) =>
          upsert.mutate({
            projectId,
            scopeSummary: e.target.value,
            siteVisitDate: row?.siteVisitDate ?? undefined,
          })
        }
      />
      <Stack orientation="horizontal" gap={3}>
        <Link to="/office/letters">
          <Button kind="tertiary" size="sm">Draft letter of appointment</Button>
        </Link>
        <Link to="/accounting/fees">
          <Button kind="tertiary" size="sm">Fee proposal</Button>
        </Link>
        {row?.status !== "COMPLETE" && (
          <Button size="sm" disabled={complete.isPending} onClick={() => complete.mutate({ projectId })}>
            Mark appointment complete
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
