import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { useState } from "react";
import type { DocumentEntityType } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

export function DocumentReviseButton({
  entityType,
  entityId,
  label = "Revise",
  onDone,
}: {
  entityType: DocumentEntityType;
  entityId: string;
  label?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [impactNote, setImpactNote] = useState("");
  const revise = trpc.documents.revise.useMutation({
    onSuccess: () => {
      setOpen(false);
      setRevisionNote("");
      setImpactNote("");
      onDone?.();
    },
  });

  return (
    <>
      <Button variant="text" size="small" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Document revision</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="doc-rev"
              label="Revision note"
              multiline
              minRows={3}
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              fullWidth
            />
            <TextField
              id="doc-imp"
              label="Impact note (optional)"
              multiline
              minRows={3}
              value={impactNote}
              onChange={(e) => setImpactNote(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!revisionNote || revise.isPending}
            onClick={() =>
              revise.mutate({
                entityType,
                entityId,
                revisionNote,
                impactNote: impactNote || undefined,
              })
            }
          >
            {revise.isPending ? "Saving…" : "Revise"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
