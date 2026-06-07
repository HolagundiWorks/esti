import { Button } from "@carbon/react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

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
      refetchInterval: (q) =>
        q.state.data &&
        (q.state.data.pdfStatus === "PENDING" || q.state.data.pdfStatus === "PROCESSING")
          ? 1500
          : false,
    },
  );

  const generate = trpc.payroll.generatePdf.useMutation({
    onSuccess: () => {
      setActive(true);
      utils.payroll.byId.invalidate({ id: payslipId });
    },
  });

  const status = byId.data?.pdfStatus ?? initialStatus;
  const url = byId.data?.pdfUrl ?? null;

  if (status === "READY" && url) {
    return (
      <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
        Open slip
      </Button>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span style={{ fontSize: 12, color: "#6f6f6f" }}>Generating…</span>;
  }
  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={generate.isPending}
      onClick={() => generate.mutate({ id: payslipId })}
    >
      {status === "FAILED" ? "Retry slip" : "Salary slip"}
    </Button>
  );
}
