import { Button } from "@carbon/react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

/** Render & open a watermarked issue-set PDF for a drawing. */
export function DrawingIssueCell({
  drawingId,
  initialStatus,
}: {
  drawingId: string;
  initialStatus: string;
}) {
  const utils = trpc.useUtils();
  const [active, setActive] = useState(initialStatus !== "NONE");

  const byId = trpc.drawings.byId.useQuery(
    { id: drawingId },
    {
      enabled: active,
      refetchInterval: (q) =>
        q.state.data &&
        (q.state.data.issuePdfStatus === "PENDING" || q.state.data.issuePdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );

  const issue = trpc.drawings.issuePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.drawings.byId.invalidate({ id: drawingId });
    },
  });

  const status = byId.data?.issuePdfStatus ?? initialStatus;
  const url = byId.data?.issuePdfUrl ?? null;

  if (status === "READY" && url) {
    return (
      <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
        Open issue
      </Button>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span style={{ fontSize: 12, color: "#6f6f6f" }}>Rendering…</span>;
  }
  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={issue.isPending}
      onClick={() => {
        const watermark = window.prompt("Watermark text", "ISSUED FOR APPROVAL") ?? undefined;
        issue.mutate({ id: drawingId, watermark });
      }}
    >
      {status === "FAILED" ? "Retry issue" : "Issue PDF"}
    </Button>
  );
}
