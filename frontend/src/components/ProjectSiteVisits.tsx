import {
  Button,
  Modal,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "green" | "red" | "blue"> = {
  PLANNED: "blue",
  CONFIRMED: "green",
  CANCELLED: "red",
};

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

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3}>
        <h4>Site Visits</h4>
        {canWrite && <Button size="sm" onClick={() => setCreateOpen(true)}>Schedule visit</Button>}
      </Stack>

      {listQ.isLoading && <p>Loading…</p>}
      {visits.length === 0 && !listQ.isLoading && (
        <Tile><p>No site visits scheduled yet.</p></Tile>
      )}

      <Stack gap={3}>
        {visits.map((v) => (
          <Tile key={v.id}>
            <Stack gap={3}>
              <Stack orientation="horizontal" gap={3}>
                <strong>{v.plannedDate}</strong>
                <Tag type={STATUS_TAG[v.status] ?? "gray"}>{v.status}</Tag>
                {v.supervisorConfirmedAt && <Tag type="green" size="sm">Supervisor ✓</Tag>}
                {v.contractorConfirmedAt && <Tag type="green" size="sm">Contractor ✓</Tag>}
              </Stack>
              {v.notes && <p className="esti-label--secondary">{v.notes}</p>}
              {v.cancelReason && <p className="esti-label--secondary">Reason: {v.cancelReason}</p>}
              {v.autoCancelAfter && v.status === "PLANNED" && (
                <p className="esti-label--helper">Auto-cancel if not confirmed by {v.autoCancelAfter}</p>
              )}
              {canWrite && v.status !== "CANCELLED" && (
                <Stack orientation="horizontal" gap={3}>
                  {!v.supervisorConfirmedAt && (
                    <Button size="sm" kind="tertiary"
                      disabled={confirm.isPending}
                      onClick={() => confirm.mutate({ id: v.id, side: "SUPERVISOR" })}>
                      Confirm (supervisor)
                    </Button>
                  )}
                  {!v.contractorConfirmedAt && (
                    <Button size="sm" kind="tertiary"
                      disabled={confirm.isPending}
                      onClick={() => confirm.mutate({ id: v.id, side: "CONTRACTOR" })}>
                      Confirm (contractor)
                    </Button>
                  )}
                  <Button size="sm" kind="danger--ghost"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate({ id: v.id })}>
                    Cancel visit
                  </Button>
                </Stack>
              )}
            </Stack>
          </Tile>
        ))}
      </Stack>

      <Modal
        open={createOpen}
        modalHeading="Schedule site visit"
        primaryButtonText={create.isPending ? "Saving…" : "Schedule"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.plannedDate || create.isPending}
        onRequestClose={() => { setCreateOpen(false); resetForm(); }}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            plannedDate: form.plannedDate,
            notes: form.notes || undefined,
            autoCancelAfter: form.autoCancelAfter || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="sv-date" labelText="Planned date" type="date" value={form.plannedDate}
            onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))} />
          <TextInput id="sv-acd" labelText="Auto-cancel if not confirmed by (optional)" type="date"
            value={form.autoCancelAfter}
            onChange={(e) => setForm((f) => ({ ...f, autoCancelAfter: e.target.value }))} />
          <TextArea id="sv-notes" labelText="Notes (optional)" rows={3} value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Stack>
      </Modal>
    </Stack>
  );
}
