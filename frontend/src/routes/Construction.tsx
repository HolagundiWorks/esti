import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
} from "@carbon/react";
import {
  CONSTRUCTION_KIND_LABEL,
  CONSTRUCTION_STATUS_LABEL,
  ConstructionKind,
  ConstructionStatus,
  type ConstructionKind as ConstructionKindT,
  type ConstructionStatus as ConstructionStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

export function Construction() {
  const utils = trpc.useUtils();
  const [openOnly, setOpenOnly] = useState(true);
  const [kind, setKind] = useState("");
  const listQ = trpc.construction.list.useQuery({
    openOnly: openOnly || undefined,
    kind: kind ? (kind as ConstructionKindT) : undefined,
  });
  const rows = listQ.data ?? [];

  const [respondId, setRespondId] = useState<string | null>(null);
  const [respondForm, setRespondForm] = useState({ status: "ACKNOWLEDGED" as ConstructionStatusT, note: "" });
  const respond = trpc.construction.respond.useMutation({
    onSuccess: () => {
      void utils.construction.list.invalidate();
      void utils.construction.openCount.invalidate();
      setRespondId(null);
    },
  });

  const selected = rows.find((r) => r.id === respondId);

  return (
    <Stack gap={6}>
      <PageHeader
        title="Construction coordination"
        description="Contractor RFIs, submittals, inspection requests, snags, and NCRs from site."
      />

      <Stack orientation="horizontal" gap={5}>
        <Select id="cn-open" labelText="Filter" hideLabel size="sm" value={openOnly ? "open" : "all"} onChange={(e) => setOpenOnly(e.target.value === "open")}>
          <SelectItem value="open" text="Open only" />
          <SelectItem value="all" text="All statuses" />
        </Select>
        <Select id="cn-kind" labelText="Kind" hideLabel size="sm" value={kind} onChange={(e) => setKind(e.target.value)}>
          <SelectItem value="" text="All kinds" />
          {ConstructionKind.options.map((k) => (
            <SelectItem key={k} value={k} text={CONSTRUCTION_KIND_LABEL[k]} />
          ))}
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Could not load items" subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No construction items", description: "Contractors raise RFIs and submittals via their bid portal link." }}
      >
        <TableContainer title="Construction inbox">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Kind</TableHeader>
                <TableHeader>Subject</TableHeader>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{CONSTRUCTION_KIND_LABEL[r.kind as ConstructionKindT] ?? r.kind}</TableCell>
                  <TableCell>
                    {r.subject}
                    {r.body && <div className="esti-label esti-label--helper">{r.body}</div>}
                  </TableCell>
                  <TableCell>{r.contractorName}</TableCell>
                  <TableCell>
                    <Link to={`/projects/${r.projectId}`}>{r.projectRef}</Link>
                  </TableCell>
                  <TableCell>
                    <Tag type={r.status === "OPEN" ? "blue" : r.status === "RESOLVED" ? "green" : "gray"} size="sm">
                      {CONSTRUCTION_STATUS_LABEL[r.status as ConstructionStatusT] ?? r.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => { setRespondId(r.id); setRespondForm({ status: "ACKNOWLEDGED", note: r.responseNote ?? "" }); }}>
                      Respond
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={respondId !== null}
        modalHeading={selected ? `Respond — ${selected.subject}` : "Respond"}
        primaryButtonText={respond.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={respond.isPending}
        onRequestClose={() => setRespondId(null)}
        onRequestSubmit={() => respondId && respond.mutate({ id: respondId, status: respondForm.status, responseNote: respondForm.note || undefined })}
      >
        <Stack gap={5}>
          <Select id="cn-status" labelText="Status" value={respondForm.status} onChange={(e) => setRespondForm((f) => ({ ...f, status: e.target.value as ConstructionStatusT }))}>
            {ConstructionStatus.options.map((s) => (
              <SelectItem key={s} value={s} text={CONSTRUCTION_STATUS_LABEL[s]} />
            ))}
          </Select>
          <TextArea id="cn-note" labelText="Response note" rows={4} value={respondForm.note} onChange={(e) => setRespondForm((f) => ({ ...f, note: e.target.value }))} />
          {respond.error && <InlineNotification kind="error" title="Could not save" subtitle={respond.error.message} hideCloseButton lowContrast />}
        </Stack>
      </Modal>
    </Stack>
  );
}
