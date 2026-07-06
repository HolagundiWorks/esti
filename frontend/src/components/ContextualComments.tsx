import { Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

export function ContextualComments({
  projectId,
  objectType,
  objectId,
  heading,
  description,
}: {
  projectId: string;
  objectType: "projectoffice" | "task";
  objectId: string;
  heading: string;
  description?: string;
}) {
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const commentsQ = trpc.comments.listByObject.useQuery(
    { projectId, objectType, objectId },
    { enabled: !!projectId && !!objectId },
  );
  const create = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setBody("");
      await utils.comments.listByObject.invalidate({ projectId, objectType, objectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="h6" component="h3">{heading}</Typography>
          {description && <Typography variant="body2">{description}</Typography>}
        </Stack>
        <TextField
          id={`comment-${objectType}-${objectId}`}
          label="Add a contextual comment"
          multiline
          minRows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          fullWidth
        />
        <Button
          variant="contained"
          disabled={!body.trim() || create.isPending}
          onClick={() => create.mutate({ projectId, objectType, objectId, body })}
          sx={{ alignSelf: "flex-start" }}
        >
          {create.isPending ? "Adding…" : "Add comment"}
        </Button>
        <Stack spacing={2}>
          {(commentsQ.data?.rows ?? []).map((comment) => (
            <Stack key={comment.id} spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Chip
                  size="small"
                  label={comment.visibility}
                  sx={{
                    backgroundColor: "var(--cds-tag-background-blue)",
                    color: "var(--cds-tag-color-blue)",
                  }}
                />
                <span>{comment.actorName ?? "System"}</span>
                <Typography variant="caption" color="text.secondary">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.createdAt))}
                </Typography>
              </Stack>
              <p style={{ whiteSpace: "pre-wrap" }}>{comment.body}</p>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
