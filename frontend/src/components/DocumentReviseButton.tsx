import { Button, Modal, Stack, TextArea } from "@carbon/react";
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
      <Button kind="ghost" size="sm" onClick={() => setOpen(true)}>{label}</Button>
      <Modal
        open={open}
        modalHeading="Document revision"
        primaryButtonText={revise.isPending ? "Saving…" : "Revise"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!revisionNote || revise.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          revise.mutate({
            entityType,
            entityId,
            revisionNote,
            impactNote: impactNote || undefined,
          })
        }
      >
        <Stack gap={4}>
          <TextArea id="doc-rev" labelText="Revision note" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} />
          <TextArea id="doc-imp" labelText="Impact note (optional)" value={impactNote} onChange={(e) => setImpactNote(e.target.value)} />
        </Stack>
      </Modal>
    </>
  );
}
