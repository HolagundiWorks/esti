import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { PdfActionButtons } from "./PdfActionButtons.js";

/** Per-payslip PDF action: generate via the worker, poll, then open. */
export function PayslipPdfCell({
  payslipId,
  initialStatus,
}: {
  payslipId: string;
  initialStatus: string;
}) {
  const utils = trpc.useUtils();
  const [active, setActive] = useState(initialStatus !== "NONE");

  const byId = trpc.payroll.byId.useQuery(
    { id: payslipId },
    {
      enabled: active,
      refetchInterval: (q) => pdfPollInterval(q.state.data?.pdfStatus, active),
    },
  );

  const generate = trpc.payroll.generatePdf.useMutation({
    meta: { errorTitle: "Couldn't generate the payslip PDF" },
    onSuccess: () => {
      setActive(true);
      utils.payroll.byId.invalidate({ id: payslipId });
    },
  });

  return (
    <PdfActionButtons
      status={byId.data?.pdfStatus ?? initialStatus}
      url={byId.data?.pdfUrl ?? null}
      generatePending={generate.isPending}
      onGenerate={() => generate.mutate({ id: payslipId })}
      labels={{ open: "Open slip", generate: "Salary slip", retry: "Retry slip" }}
    />
  );
}
