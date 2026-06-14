import { Button, Stack, Tag, TextArea } from "@carbon/react";
import { useState } from "react";
import { DataState } from "./DataState.js";

export interface ThreadMessage {
  id: string;
  authorName: string | null;
  authorSide: string;
  body: string;
  createdAt: string | Date;
}

const SIDE_TAG: Record<string, "blue" | "teal" | "purple"> = {
  FIRM: "blue",
  CLIENT: "teal",
  CONSULTANT: "purple",
};

/**
 * Presentational conversation thread for a portal/consultant submission.
 * The parent owns the query + reply mutation and passes data/handlers in.
 */
export function SubmissionThread({
  messages,
  loading,
  pending,
  onReply,
}: {
  messages: ThreadMessage[];
  loading: boolean;
  pending: boolean;
  onReply: (body: string) => void;
}) {
  const [body, setBody] = useState("");

  return (
    <Stack gap={5}>
      <DataState
        loading={loading}
        isEmpty={messages.length === 0}
        columnCount={1}
        empty={{ title: "No messages yet", description: "Start the conversation below." }}
      >
        <Stack gap={4}>
          {messages.map((m) => (
            <Stack key={m.id} gap={2}>
              <Stack orientation="horizontal" gap={3}>
                <Tag type={SIDE_TAG[m.authorSide] ?? "gray"} size="sm">
                  {m.authorName ?? m.authorSide}
                </Tag>
                <span className="esti-label esti-label--helper">
                  {new Date(m.createdAt as string).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </Stack>
              <p>{m.body}</p>
            </Stack>
          ))}
        </Stack>
      </DataState>

      <Stack gap={3}>
        <TextArea id="thread-reply" labelText="Reply" rows={2} value={body}
          onChange={(e) => setBody(e.target.value)} />
        <Button size="sm" disabled={!body.trim() || pending}
          onClick={() => { onReply(body.trim()); setBody(""); }}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </Stack>
    </Stack>
  );
}
