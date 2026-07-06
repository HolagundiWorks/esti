import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  REVISION_CATEGORY_LABEL,
  RevisionCategory,
  type RevisionCategory as RevisionCategoryT,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

// Client portal: issued meeting minutes + the ESTI shortcut. ESTI reads the
// minutes and drafts the revision requests the client would otherwise have to
// write; each draft is editable and only reaches the office when the client
// presses "Send to architect" (a normal change request under the hood).

type DraftSuggestion = {
  key: string;
  subject: string;
  details: string;
  category: RevisionCategoryT;
};

function chipTokens(color: string) {
  return {
    backgroundColor: `var(--cds-tag-background-${color})`,
    color: `var(--cds-tag-color-${color})`,
  };
}

export function PortalMinutes({
  projectId,
  onSubmitted,
}: {
  projectId: string;
  onSubmitted: () => void;
}) {
  const momsQ = trpc.portal.listMoms.useQuery({ projectId });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftSuggestion[]>>({});
  const [suggestedFor, setSuggestedFor] = useState<Set<string>>(new Set());
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggest = trpc.portal.suggestMomRevisions.useMutation();
  const send = trpc.portal.submitChangeRequest.useMutation();

  async function runSuggest(momId: string) {
    setError(null);
    setSuggestingId(momId);
    try {
      const res = await suggest.mutateAsync({ momId });
      setDrafts((prev) => ({
        ...prev,
        [momId]: res.suggestions.map((s, i) => ({
          key: `${momId}-${res.runId}-${i}`,
          subject: s.title,
          details: s.details,
          category: s.category,
        })),
      }));
      setSuggestedFor((prev) => new Set(prev).add(momId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ESTI could not read the minutes.");
    } finally {
      setSuggestingId(null);
    }
  }

  function patchDraft(momId: string, key: string, patch: Partial<DraftSuggestion>) {
    setDrafts((prev) => ({
      ...prev,
      [momId]: (prev[momId] ?? []).map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));
  }

  function dropDraft(momId: string, key: string) {
    setDrafts((prev) => ({
      ...prev,
      [momId]: (prev[momId] ?? []).filter((d) => d.key !== key),
    }));
  }

  async function sendDraft(momId: string, draft: DraftSuggestion) {
    setError(null);
    setSendingKey(draft.key);
    try {
      await send.mutateAsync({
        projectId,
        subject: draft.subject.trim(),
        body: draft.details.trim(),
        revisionCategory: draft.category,
        objectType: "MOM",
        objectId: momId,
      });
      dropDraft(momId, draft.key);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the request.");
    } finally {
      setSendingKey(null);
    }
  }

  const moms = momsQ.data ?? [];

  return (
    <Stack spacing={1}>
      <Typography variant="h6" component="h4">Meeting minutes</Typography>
      <p className="esti-label esti-label--secondary">
        Minutes your architect has issued. ESTI can read them and draft your revision
        requests — review, edit, and send only the ones you want.
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          <AlertTitle>Revision requests</AlertTitle>
          {error}
        </Alert>
      )}

      {momsQ.isLoading && <p className="esti-label esti-label--secondary">Loading…</p>}
      {!momsQ.isLoading && moms.length === 0 && (
        <Box sx={{ p: 2, border: 1, borderColor: "divider" }}>
          <Typography variant="body1">No issued meeting minutes yet.</Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {moms.map((m) => {
          const momDrafts = drafts[m.id] ?? [];
          const hasRun = suggestedFor.has(m.id);
          return (
            <Box key={m.id} sx={{ p: 2, border: 1, borderColor: "divider" }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <Typography variant="body1">
                    <strong>{m.ref} — {m.title}</strong>
                  </Typography>
                  {m.meetingDate && (
                    <Chip size="small" label={m.meetingDate} sx={chipTokens("cool-gray")} />
                  )}
                </Stack>
                {m.attendees && (
                  <p className="esti-label esti-label--secondary">Attendees: {m.attendees}</p>
                )}
                {expandedId === m.id && m.minutes && (
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{m.minutes}</Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  >
                    {expandedId === m.id ? "Hide minutes" : "Read minutes"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={suggestingId !== null}
                    onClick={() => void runSuggest(m.id)}
                  >
                    {hasRun ? "Ask ESTI again" : "Ask ESTI to draft my revision requests"}
                  </Button>
                  {suggestingId === m.id && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">ESTI is reading the minutes…</Typography>
                    </Stack>
                  )}
                </Stack>

                {hasRun && momDrafts.length === 0 && suggestingId !== m.id && (
                  <p className="esti-label esti-label--secondary">
                    ESTI found no revision requests in these minutes — you can still raise one
                    yourself from the change-request form above.
                  </p>
                )}

                {momDrafts.map((draft) => (
                  <Box key={draft.key} sx={{ p: 2, border: 1, borderColor: "divider" }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row">
                        <Chip
                          size="small"
                          label="ESTI draft — review before sending"
                          sx={chipTokens("purple")}
                        />
                      </Stack>
                      <TextField
                        id={`sub-${draft.key}`}
                        label="Subject"
                        value={draft.subject}
                        onChange={(e) => patchDraft(m.id, draft.key, { subject: e.target.value })}
                        fullWidth
                      />
                      <TextField
                        id={`body-${draft.key}`}
                        label="Request"
                        multiline
                        rows={3}
                        value={draft.details}
                        onChange={(e) => patchDraft(m.id, draft.key, { details: e.target.value })}
                        fullWidth
                      />
                      <TextField
                        id={`cat-${draft.key}`}
                        label="Impact"
                        select
                        value={draft.category}
                        onChange={(e) =>
                          patchDraft(m.id, draft.key, {
                            category: e.target.value as RevisionCategoryT,
                          })
                        }
                        fullWidth
                      >
                        {RevisionCategory.options.map((c) => (
                          <MenuItem key={c} value={c}>
                            {REVISION_CATEGORY_LABEL[c]}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={sendingKey !== null || !draft.subject.trim() || !draft.details.trim()}
                          onClick={() => void sendDraft(m.id, draft)}
                        >
                          {sendingKey === draft.key ? "Sending…" : "Send to architect"}
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          disabled={sendingKey !== null}
                          onClick={() => dropDraft(m.id, draft.key)}
                        >
                          Discard
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
