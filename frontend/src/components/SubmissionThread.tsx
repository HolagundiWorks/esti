import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { DataState } from "./DataState.js";
import { StatusDot } from "./StatusTag.js";

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
 * Material UI.
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
    <Stack spacing={2}>
      <DataState
        loading={loading}
        isEmpty={messages.length === 0}
        columnCount={1}
        empty={{ title: "No messages yet", description: "Start the conversation below." }}
      >
        <Stack spacing={2}>
          {messages.map((m) => {
            const color = SIDE_TAG[m.authorSide] ?? "gray";
            return (
              <Stack key={m.id} spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <StatusDot color={color} label={m.authorName ?? m.authorSide} />
                  <span className="esti-label esti-label--helper">
                    {new Date(m.createdAt as string).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </Stack>
                <p>{m.body}</p>
              </Stack>
            );
          })}
        </Stack>
      </DataState>

      <Stack spacing={1}>
        <TextField
          id="thread-reply"
          label="Reply"
          multiline
          minRows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          fullWidth
        />
        <Button
          variant="contained"
          size="small"
          disabled={!body.trim() || pending}
          onClick={() => {
            onReply(body.trim());
            setBody("");
          }}
        >
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </Stack>
    </Stack>
  );
}
