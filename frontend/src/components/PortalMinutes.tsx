import {
  Button,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
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
    <Stack gap={3}>
      <h4>Meeting minutes</h4>
      <p className="esti-label esti-label--secondary">
        Minutes your architect has issued. ESTI can read them and draft your revision
        requests — review, edit, and send only the ones you want.
      </p>

      {error && (
        <InlineNotification
          kind="error"
          title="Revision requests"
          subtitle={error}
          lowContrast
          onCloseButtonClick={() => setError(null)}
        />
      )}

      {momsQ.isLoading && <p className="esti-label esti-label--secondary">Loading…</p>}
      {!momsQ.isLoading && moms.length === 0 && (
        <Tile>
          <p>No issued meeting minutes yet.</p>
        </Tile>
      )}

      <Stack gap={3}>
        {moms.map((m) => {
          const momDrafts = drafts[m.id] ?? [];
          const hasRun = suggestedFor.has(m.id);
          return (
            <Tile key={m.id}>
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap", alignItems: "center" }}>
                  <strong>
                    {m.ref} — {m.title}
                  </strong>
                  {m.meetingDate && <Tag type="cool-gray" size="sm">{m.meetingDate}</Tag>}
                </Stack>
                {m.attendees && (
                  <p className="esti-label esti-label--secondary">Attendees: {m.attendees}</p>
                )}
                {expandedId === m.id && m.minutes && (
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.minutes}</p>
                )}
                <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  >
                    {expandedId === m.id ? "Hide minutes" : "Read minutes"}
                  </Button>
                  <Button
                    kind="tertiary"
                    size="sm"
                    disabled={suggestingId !== null}
                    onClick={() => void runSuggest(m.id)}
                  >
                    {hasRun ? "Ask ESTI again" : "Ask ESTI to draft my revision requests"}
                  </Button>
                  {suggestingId === m.id && <InlineLoading description="ESTI is reading the minutes…" />}
                </Stack>

                {hasRun && momDrafts.length === 0 && suggestingId !== m.id && (
                  <p className="esti-label esti-label--secondary">
                    ESTI found no revision requests in these minutes — you can still raise one
                    yourself from the change-request form above.
                  </p>
                )}

                {momDrafts.map((draft) => (
                  <Tile key={draft.key}>
                    <Stack gap={4}>
                      <Tag type="purple" size="sm">
                        ESTI draft — review before sending
                      </Tag>
                      <TextInput
                        id={`sub-${draft.key}`}
                        labelText="Subject"
                        value={draft.subject}
                        onChange={(e) => patchDraft(m.id, draft.key, { subject: e.target.value })}
                      />
                      <TextArea
                        id={`body-${draft.key}`}
                        labelText="Request"
                        rows={3}
                        value={draft.details}
                        onChange={(e) => patchDraft(m.id, draft.key, { details: e.target.value })}
                      />
                      <Select
                        id={`cat-${draft.key}`}
                        labelText="Impact"
                        value={draft.category}
                        onChange={(e) =>
                          patchDraft(m.id, draft.key, {
                            category: e.target.value as RevisionCategoryT,
                          })
                        }
                      >
                        {RevisionCategory.options.map((c) => (
                          <SelectItem key={c} value={c} text={REVISION_CATEGORY_LABEL[c]} />
                        ))}
                      </Select>
                      <Stack orientation="horizontal" gap={3}>
                        <Button
                          size="sm"
                          disabled={sendingKey !== null || !draft.subject.trim() || !draft.details.trim()}
                          onClick={() => void sendDraft(m.id, draft)}
                        >
                          {sendingKey === draft.key ? "Sending…" : "Send to architect"}
                        </Button>
                        <Button
                          size="sm"
                          kind="ghost"
                          disabled={sendingKey !== null}
                          onClick={() => dropDraft(m.id, draft.key)}
                        >
                          Discard
                        </Button>
                      </Stack>
                    </Stack>
                  </Tile>
                ))}
              </Stack>
            </Tile>
          );
        })}
      </Stack>
    </Stack>
  );
}
