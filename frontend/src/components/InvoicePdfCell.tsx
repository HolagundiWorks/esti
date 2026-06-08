import { Button } from "@carbon/react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

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
      refetchInterval: (q) =>
        q.state.data && (q.state.data.pdfStatus === "PENDING" || q.state.data.pdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );

  const generate = trpc.invoices.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.invoices.byId.invalidate({ id: invoiceId });
    },
  });

  const status = byId.data?.pdfStatus ?? initialStatus;
  const url = byId.data?.pdfUrl ?? null;

  if (status === "READY" && url) {
    return (
      <span style={{ display: "inline-flex", gap: 4 }}>
        <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
          Open PDF
        </Button>
        {canManage && (
          <Button
            kind="ghost"
            size="sm"
            disabled={generate.isPending}
            onClick={() => generate.mutate({ id: invoiceId })}
          >
            Regenerate
          </Button>
        )}
      </span>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Generating…</span>;
  }
  if (!canManage) {
    return <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>—</span>;
  }
  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={generate.isPending}
      onClick={() => generate.mutate({ id: invoiceId })}
    >
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}
