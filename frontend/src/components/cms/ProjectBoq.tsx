import { useState } from "react";
import {
  Button,
  InlineLoading,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { Archive, Download } from "@carbon/icons-react";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

export function ProjectBoq({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const boqQ = trpc.cms.boq.byProject.useQuery({ projectId });
  const setsQ = trpc.cms.finalSet.listByProject.useQuery({ projectId });
  const markFinal = trpc.cms.finalSet.markFinal.useMutation({
    onSuccess: () => {
      utils.cms.finalSet.listByProject.invalidate({ projectId });
    },
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const boq = boqQ.data?.boq ?? [];
  const total = boqQ.data?.totalPaise ?? 0;
  const sets = setsQ.data ?? [];

  function submit() {
    markFinal.mutate({ projectId, title: title.trim() || `Estimate Rev ${(sets.length ?? 0) + 1}` });
    setOpen(false);
    setTitle("");
  }

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={4}>
        <Stack gap={2} className="esti-grow">
          <h2>Bill of Quantities</h2>
          <p>
            Grouped from the live element list — same specification lines are summed.
            Freeze a revision to create a permanent cost record in Documents.
          </p>
        </Stack>
        <Tag type="green" size="lg">{`Total ${formatINR(total)}`}</Tag>
        <Button renderIcon={Archive} onClick={() => setOpen(true)} disabled={boq.length === 0}>
          Mark as Final
        </Button>
      </Stack>

      <DataState
        loading={boqQ.isLoading}
        isEmpty={boq.length === 0}
        columnCount={5}
        empty={{ title: "No elements yet", description: "Add elements in the Estimate tab first." }}
      >
        <TableContainer title="BOQ Summary">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Total Qty</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader>Total Amount</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {boq.map((b, i) => (
                <TableRow key={i}>
                  <TableCell>{b.description}</TableCell>
                  <TableCell>{b.unit ?? "—"}</TableCell>
                  <TableCell>{b.totalQuantity}</TableCell>
                  <TableCell>{formatINR(b.ratePaise)}</TableCell>
                  <TableCell>{formatINR(b.totalAmountPaise)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4}><strong>Total</strong></TableCell>
                <TableCell><strong>{formatINR(total)}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* Final Estimation Set history */}
      {sets.length > 0 && (
        <Stack gap={3}>
          <h4>Final Estimation Records</h4>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Rev</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>PDF</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {sets.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>Rev {s.revisionNo}</TableCell>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>{formatINR(s.totalPaise)}</TableCell>
                  <TableCell>
                    <Tag type={s.status === "FINAL" ? "green" : "gray"} size="sm">{s.status}</Tag>
                  </TableCell>
                  <TableCell>
                    {s.pdfStatus === "READY" && s.pdfKey ? (
                      <Button kind="ghost" size="sm" renderIcon={Download} href={`/files/${s.pdfKey}`} target="_blank">
                        PDF
                      </Button>
                    ) : s.pdfStatus === "PENDING" ? (
                      <InlineLoading description="Generating…" />
                    ) : (
                      <Tag type="gray" size="sm">{s.pdfStatus}</Tag>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}

      <Modal
        open={open}
        modalHeading="Mark Estimate as Final"
        primaryButtonText={markFinal.isPending ? "Freezing…" : "Freeze & Generate PDF"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={markFinal.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={submit}
        size="sm"
      >
        <Stack gap={5}>
          <p>
            This creates a permanent, immutable snapshot of the current estimate and BOQ
            (Revision {sets.length + 1}). A PDF will be generated and saved to Documents.
            The live element list is not affected.
          </p>
          <TextInput
            id="fset-title"
            labelText="Title"
            placeholder={`Estimate Rev ${sets.length + 1}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
