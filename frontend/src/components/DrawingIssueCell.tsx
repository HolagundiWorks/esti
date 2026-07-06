import Share from "@mui/icons-material/Share";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { shareViaWhatsApp } from "../lib/whatsapp.js";

/** Render & open a watermarked issue-set PDF for a drawing. Material UI. */
export function DrawingIssueCell({
  drawingId,
  initialStatus,
}: {
  drawingId: string;
  initialStatus: string;
}) {
  const utils = trpc.useUtils();
  const [active, setActive] = useState(initialStatus !== "NONE");
  const [open, setOpen] = useState(false);
  const [watermark, setWatermark] = useState("ISSUED FOR APPROVAL");

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
      setOpen(false);
      utils.drawings.byId.invalidate({ id: drawingId });
    },
  });

  const status = byId.data?.issuePdfStatus ?? initialStatus;
  const url = byId.data?.issuePdfUrl ?? null;

  if (status === "READY" && url) {
    return (
      <Stack direction="row" spacing={0.5}>
        <Button variant="text" size="small" href={url} target="_blank" rel="noreferrer">
          Open issue
        </Button>
        <Button
          variant="text"
          size="small"
          startIcon={<Share />}
          onClick={() =>
            void shareViaWhatsApp({
              fileUrl: url,
              fileName: "drawing.pdf",
              text: "Please find the attached drawing.",
            })
          }
        >
          WhatsApp
        </Button>
      </Stack>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span>Rendering…</span>;
  }
  return (
    <>
      <Button variant="text" size="small" disabled={issue.isPending} onClick={() => setOpen(true)}>
        {status === "FAILED" ? "Retry issue" : "Issue PDF"}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Issue drawing (watermarked PDF)</DialogTitle>
        <DialogContent>
          <TextField
            id={`wm-${drawingId}`}
            label="Watermark text"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={issue.isPending}
            onClick={() => issue.mutate({ id: drawingId, watermark: watermark || undefined })}
          >
            {issue.isPending ? "Rendering…" : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
