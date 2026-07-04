import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { PdfActionButtons } from "./PdfActionButtons.js";

/** Per-invoice PDF action: generate via the worker, poll, then open. */
export function InvoicePdfCell({
  invoiceId,
  initialStatus,
  canManage = true,
}: {
  invoiceId: string;
  initialStatus: string;
  /** Only roles with invoice:manage may (re)generate the PDF. */
  canManage?: boolean;
}) {
  const utils = trpc.useUtils();
  const [active, setActive] = useState(initialStatus !== "NONE");

  const byId = trpc.invoices.byId.useQuery(
    { id: invoiceId },
    {
      enabled: active,
      refetchInterval: (q) => pdfPollInterval(q.state.data?.pdfStatus, active),
    },
  );

  const generate = trpc.invoices.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.invoices.byId.invalidate({ id: invoiceId });
    },
  });

  return (
    <PdfActionButtons
      status={byId.data?.pdfStatus ?? initialStatus}
      url={byId.data?.pdfUrl ?? null}
      canManage={canManage}
      showRegenerateWhenReady
      generatePending={generate.isPending}
      onGenerate={() => generate.mutate({ id: invoiceId })}
      share={{ text: "Please find the attached invoice.", fileName: "invoice.pdf" }}
    />
  );
}
