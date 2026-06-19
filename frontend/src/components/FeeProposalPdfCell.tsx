import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { PdfActionButtons } from "./PdfActionButtons.js";

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
      refetchInterval: (q) => pdfPollInterval(q.state.data?.pdfStatus, active),
    },
  );

  const generate = trpc.feeProposals.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.feeProposals.byId.invalidate({ id: feeId });
    },
  });

  return (
    <PdfActionButtons
      status={byId.data?.pdfStatus ?? initialStatus}
      url={byId.data?.pdfUrl ?? null}
      generatePending={generate.isPending}
      onGenerate={() => generate.mutate({ id: feeId })}
    />
  );
}
