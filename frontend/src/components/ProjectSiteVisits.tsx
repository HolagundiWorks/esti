import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

const STATUS_TAG: Record<string, "gray" | "green" | "red" | "blue"> = {
  PLANNED: "blue",
  CONFIRMED: "green",
  CANCELLED: "red",
};

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

export function ProjectSiteVisits({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.siteVisits.list.useQuery({ projectId });
  const invalidate = () => utils.siteVisits.list.invalidate({ projectId });

  const create = trpc.siteVisits.create.useMutation({
    onSuccess: () => { invalidate(); setCreateOpen(false); resetForm(); },
  });
  const confirm = trpc.siteVisits.confirm.useMutation({ onSuccess: invalidate });
  const cancel = trpc.siteVisits.cancel.useMutation({ onSuccess: invalidate });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ plannedDate: "", notes: "", autoCancelAfter: "" });
  const resetForm = () => setForm({ plannedDate: "", notes: "", autoCancelAfter: "" });

  const canWrite = can(user?.role, "write");
  const visits = listQ.data ?? [];

  const closeCreate = () => { setCreateOpen(false); resetForm(); };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="h6" component="h4">Site Visits</Typography>
        {canWrite && (
          <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
            Schedule visit
          </Button>
        )}
      </Stack>

      {listQ.isLoading && <Typography variant="body2">Loading…</Typography>}
      {visits.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2 }}><Typography variant="body2">No site visits scheduled yet.</Typography></Box>
      )}

      <Stack spacing={1}>
        {visits.map((v) => (
          <Box key={v.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <strong>{v.plannedDate}</strong>
                <StatusDot color={STATUS_TAG[v.status] ?? "gray"} label={v.status} />
                {v.supervisorConfirmedAt && <StatusDot color="green" label="Supervisor ✓" />}
                {v.contractorConfirmedAt && <StatusDot color="green" label="Contractor ✓" />}
              </Stack>
              {v.notes && <p className="esti-label--secondary">{v.notes}</p>}
              {v.cancelReason && <p className="esti-label--secondary">Reason: {v.cancelReason}</p>}
              {v.autoCancelAfter && v.status === "PLANNED" && (
                <p className="esti-label--helper">Auto-cancel if not confirmed by {v.autoCancelAfter}</p>
              )}
              {canWrite && v.status !== "CANCELLED" && (
                <Stack direction="row" spacing={1}>
                  {!v.supervisorConfirmedAt && (
                    <Button size="small" variant="outlined"
                      disabled={confirm.isPending}
                      onClick={() => confirm.mutate({ id: v.id, side: "SUPERVISOR" })}>
                      Confirm (supervisor)
                    </Button>
                  )}
                  {!v.contractorConfirmedAt && (
                    <Button size="small" variant="outlined"
                      disabled={confirm.isPending}
                      onClick={() => confirm.mutate({ id: v.id, side: "CONTRACTOR" })}>
                      Confirm (contractor)
                    </Button>
                  )}
                  <Button size="small" variant="text" color="error"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate({ id: v.id })}>
                    Cancel visit
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="xs">
        <DialogTitle>Schedule site visit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="sv-date" label="Planned date" type="date" value={form.plannedDate}
              onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
              fullWidth {...shrink} />
            <TextField id="sv-acd" label="Auto-cancel if not confirmed by (optional)" type="date"
              value={form.autoCancelAfter}
              onChange={(e) => setForm((f) => ({ ...f, autoCancelAfter: e.target.value }))}
              fullWidth {...shrink} />
            <TextField id="sv-notes" label="Notes (optional)" multiline minRows={3} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={closeCreate}>Cancel</Button>
          <Button variant="contained" disabled={!form.plannedDate || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                plannedDate: form.plannedDate,
                notes: form.notes || undefined,
                autoCancelAfter: form.autoCancelAfter || undefined,
              })
            }>
            {create.isPending ? "Saving…" : "Schedule"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
