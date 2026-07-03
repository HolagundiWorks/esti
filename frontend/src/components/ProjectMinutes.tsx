import {
  Button,
  InlineNotification,
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

// Minutes of meeting (MoM). Draft minutes are office-internal; ISSUING locks
// them and publishes them to the client portal, where ESTI reads them and
// drafts the client's revision requests (which come back to the office as
// change requests under Tasks → Client requests).

const STATUS_TAG: Record<string, "gray" | "green"> = {
  DRAFT: "gray",
  ISSUED: "green",
};

type MomForm = {
  title: string;
  meetingDate: string;
  venue: string;
  attendees: string;
  minutes: string;
};

const EMPTY_FORM: MomForm = { title: "", meetingDate: "", venue: "", attendees: "", minutes: "" };

export function ProjectMinutes({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.moms.listByProject.useQuery({ projectId });
  const invalidate = () => utils.moms.listByProject.invalidate({ projectId });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MomForm>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };
  const create = trpc.moms.create.useMutation({ onSuccess: () => { void invalidate(); closeForm(); } });
  const update = trpc.moms.update.useMutation({ onSuccess: () => { void invalidate(); closeForm(); } });
  const issue = trpc.moms.issue.useMutation({ onSuccess: () => void invalidate() });
  const remove = trpc.moms.remove.useMutation({ onSuccess: () => void invalidate() });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];
  const busy = create.isPending || update.isPending;
  const errorText = create.error?.message ?? update.error?.message ?? issue.error?.message ?? remove.error?.message;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(m: (typeof rows)[number]) {
    setEditingId(m.id);
    setForm({
      title: m.title,
      meetingDate: m.meetingDate ?? "",
      venue: m.venue ?? "",
      attendees: m.attendees ?? "",
      minutes: m.minutes,
    });
    setFormOpen(true);
  }

  function submit() {
    const payload = {
      title: form.title.trim(),
      meetingDate: form.meetingDate || undefined,
      venue: form.venue.trim() || undefined,
      attendees: form.attendees.trim() || undefined,
      minutes: form.minutes,
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate({ projectId, ...payload });
  }

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3}>
        <h4>Minutes of meeting</h4>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            Record minutes
          </Button>
        )}
      </Stack>
      <p className="esti-label esti-label--secondary">
        Issued minutes appear in the client portal, where ESTI reads them and drafts the
        client&rsquo;s revision requests — those arrive under Tasks &rsaquo; Client requests.
      </p>

      {errorText && (
        <InlineNotification kind="error" title="Minutes" subtitle={errorText} lowContrast hideCloseButton />
      )}

      {listQ.isLoading && <p>Loading…</p>}
      {rows.length === 0 && !listQ.isLoading && (
        <Tile>
          <p>No meeting minutes recorded for this project yet.</p>
        </Tile>
      )}

      <Stack gap={3}>
        {rows.map((m) => (
          <Tile key={m.id}>
            <Stack gap={3}>
              <Stack orientation="horizontal" gap={3}>
                <strong>
                  {m.ref} — {m.title}
                </strong>
                <Tag type={STATUS_TAG[m.status] ?? "gray"} size="sm">
                  {m.status}
                </Tag>
                {m.meetingDate && <span className="esti-label--secondary">{m.meetingDate}</span>}
              </Stack>
              {m.venue && <p className="esti-label--secondary">Venue: {m.venue}</p>}
              {m.attendees && <p className="esti-label--secondary">Attendees: {m.attendees}</p>}
              {expandedId === m.id && m.minutes && (
                <p style={{ whiteSpace: "pre-wrap" }}>{m.minutes}</p>
              )}
              <Stack orientation="horizontal" gap={3}>
                <Button
                  size="sm"
                  kind="ghost"
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                >
                  {expandedId === m.id ? "Hide minutes" : "Read minutes"}
                </Button>
                {canWrite && m.status === "DRAFT" && (
                  <>
                    <Button size="sm" kind="tertiary" onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      kind="primary"
                      disabled={issue.isPending}
                      onClick={() => issue.mutate({ id: m.id })}
                    >
                      Issue to client
                    </Button>
                    <Button
                      size="sm"
                      kind="danger--ghost"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: m.id })}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Tile>
        ))}
      </Stack>

      <Modal
        open={formOpen}
        modalHeading={editingId ? "Edit minutes" : "Record minutes of meeting"}
        primaryButtonText={busy ? "Saving…" : editingId ? "Save" : "Create draft"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={busy || !form.title.trim()}
        onRequestClose={closeForm}
        onRequestSubmit={submit}
      >
        <Stack gap={5}>
          <TextInput
            id="mom-title"
            labelText="Meeting title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <TextInput
            id="mom-date"
            labelText="Meeting date"
            type="date"
            value={form.meetingDate}
            onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
          />
          <TextInput
            id="mom-venue"
            labelText="Venue"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
          />
          <TextInput
            id="mom-attendees"
            labelText="Attendees"
            helperText="Names as they should appear on the record."
            value={form.attendees}
            onChange={(e) => setForm({ ...form, attendees: e.target.value })}
          />
          <TextArea
            id="mom-minutes"
            labelText="Minutes"
            helperText="What was discussed and agreed. ESTI reads this text to draft the client's revision requests."
            rows={10}
            value={form.minutes}
            onChange={(e) => setForm({ ...form, minutes: e.target.value })}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
