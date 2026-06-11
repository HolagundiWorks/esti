import { Button, Stack, Tag, TextArea, Tile } from "@carbon/react";
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
      await utils.comments.listByObject.invalidate({
        projectId,
        objectType,
        objectId,
      });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });

  return (
    <Tile>
      <Stack gap={5}>
        <Stack gap={2}>
          <h3>{heading}</h3>
          {description && <p>{description}</p>}
        </Stack>
        <TextArea
          id={`comment-${objectType}-${objectId}`}
          labelText="Add a contextual comment"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button
          kind="primary"
          disabled={!body.trim() || create.isPending}
          onClick={() =>
            create.mutate({ projectId, objectType, objectId, body })
          }
        >
          {create.isPending ? "Adding…" : "Add comment"}
        </Button>
        <Stack gap={4}>
          {(commentsQ.data ?? []).map((comment) => (
            <Stack key={comment.id} gap={2}>
              <Stack orientation="horizontal" gap={3}>
                <Tag type="blue" size="sm">
                  {comment.visibility}
                </Tag>
                <span>{comment.actorName ?? "System"}</span>
                <span>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(comment.createdAt))}
                </span>
              </Stack>
              <p style={{ whiteSpace: "pre-wrap" }}>{comment.body}</p>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Tile>
  );
}
