import {
  Alert,
  AlertTitle,
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
import { can, type TagColor } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { StatusTag } from "./StatusTag.js";

// Minutes of meeting (MoM). Draft minutes are office-internal; ISSUING locks
// them and publishes them to the client portal, where ESTI reads them and
// drafts the client's revision requests (which come back to the office as
// change requests under Tasks → Client requests).

const STATUS_TAG: Record<string, TagColor> = {
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
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="h6">Minutes of meeting</Typography>
        {canWrite && (
          <Button variant="contained" size="small" onClick={openCreate}>
            Record minutes
          </Button>
        )}
      </Stack>
      <p className="esti-label esti-label--secondary">
        Issued minutes appear in the client portal, where ESTI reads them and drafts the
        client&rsquo;s revision requests — those arrive under Tasks &rsaquo; Client requests.
      </p>

      {errorText && (
        <Alert severity="error">
          <AlertTitle>Minutes</AlertTitle>
          {errorText}
        </Alert>
      )}

      {listQ.isLoading && <Typography variant="body2">Loading…</Typography>}
      {rows.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="body2">No meeting minutes recorded for this project yet.</Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((m) => (
          <Box key={m.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <strong>
                  {m.ref} — {m.title}
                </strong>
                <StatusTag value={m.status} map={STATUS_TAG} />
                {m.meetingDate && <span className="esti-label--secondary">{m.meetingDate}</span>}
              </Stack>
              {m.venue && <p className="esti-label--secondary">Venue: {m.venue}</p>}
              {m.attendees && <p className="esti-label--secondary">Attendees: {m.attendees}</p>}
              {expandedId === m.id && m.minutes && (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{m.minutes}</Typography>
              )}
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                >
                  {expandedId === m.id ? "Hide minutes" : "Read minutes"}
                </Button>
                {canWrite && m.status === "DRAFT" && (
                  <>
                    <Button size="small" variant="outlined" onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={issue.isPending}
                      onClick={() => issue.mutate({ id: m.id })}
                    >
                      Issue to client
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: m.id })}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Edit minutes" : "Record minutes of meeting"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="mom-title"
              label="Meeting title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <TextField
              id="mom-date"
              label="Meeting date"
              type="date"
              value={form.meetingDate}
              onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="mom-venue"
              label="Venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
            <TextField
              id="mom-attendees"
              label="Attendees"
              helperText="Names as they should appear on the record."
              value={form.attendees}
              onChange={(e) => setForm({ ...form, attendees: e.target.value })}
            />
            <TextField
              id="mom-minutes"
              label="Minutes"
              helperText="What was discussed and agreed. ESTI reads this text to draft the client's revision requests."
              multiline
              rows={10}
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={closeForm}>Cancel</Button>
          <Button variant="contained" disabled={busy || !form.title.trim()} onClick={submit}>
            {busy ? "Saving…" : editingId ? "Save" : "Create draft"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
