import { Button } from "@carbon/react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

/** Per-fee-proposal PDF action: generate via the worker, poll, then open. */
export function FeeProposalPdfCell({
  feeId,
  initialStatus,
}: {
  feeId: string;
  initialStatus: string;
}) {
  const utils = trpc.useUtils();
  const [active, setActive] = useState(initialStatus !== "NONE");

  const byId = trpc.feeProposals.byId.useQuery(
    { id: feeId },
    {
      enabled: active,
      refetchInterval: (q) =>
        q.state.data &&
        (q.state.data.pdfStatus === "PENDING" ||
          q.state.data.pdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );

  const generate = trpc.feeProposals.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.feeProposals.byId.invalidate({ id: feeId });
    },
  });

  const status = byId.data?.pdfStatus ?? initialStatus;
  const url = byId.data?.pdfUrl ?? null;

  if (status === "READY" && url) {
    return (
      <Button
        kind="ghost"
        size="sm"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        Open PDF
      </Button>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span>Generating…</span>;
  }
  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={generate.isPending}
      onClick={() => generate.mutate({ id: feeId })}
    >
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}
