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
  TextInput,
} from "@carbon/react";
import {
  COA_MIN_FEE_PCT,
  CoaWorkCategory,
  ProjectWorkType,
  coaMinimumFee,
  formatINR,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { FeeProposalPdfCell } from "../components/FeeProposalPdfCell.js";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

/** Office › Proposals — unified COA fee proposals + scope/agreements (one model). */
export function Proposals() {
  const utils = trpc.useUtils();
  const listQ = trpc.proposals.listAll.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState<string>(
    Object.values(CoaWorkCategory)[0] as string,
  );
  const [workType, setWorkType] = useState<string>(ProjectWorkType.options[0] as string);
  const [cost, setCost] = useState("");
  const [fee, setFee] = useState("");
  const [docComm, setDocComm] = useState("10");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState("");

  const create = trpc.proposals.create.useMutation({
    onSuccess: () => {
      utils.proposals.listAll.invalidate();
      setOpen(false);
      setProjectId("");
      setCost("");
      setFee("");
      setOverride("");
      setScope("");
      setNotes("");
    },
  });

  const costPaise = Math.round(Number(cost || "0") * 100);
  const feePaise = Math.round(Number(fee || "0") * 100);
  const coaMin =
    costPaise > 0
      ? coaMinimumFee(category as keyof typeof COA_MIN_FEE_PCT, costPaise)
      : 0;
  const below =
    feePaise > 0 && coaMin > 0 && isBelowCoaMinimum(feePaise, coaMin);

  return (
    <Stack gap={6}>
      <PageHeader
        title="Proposals"
        description="COA fee proposals and scope agreements across all projects."
        actions={<Button onClick={() => setOpen(true)}>New proposal</Button>}
      />

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: "No proposals",
          description: "Prepare a COA-benchmarked proposal for a project.",
          action: (
            <Button size="sm" onClick={() => setOpen(true)}>
              New proposal
            </Button>
          ),
        }}
      >
        <TableContainer title="All proposals">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Work category</TableHeader>
                <TableHeader>Fee</TableHeader>
                <TableHeader>COA</TableHeader>
                <TableHeader>Document</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.ref}</TableCell>
                  <TableCell>
                    <Link to={`/projects/${p.projectId}`}>{p.projectRef}</Link>
                    <div>{p.projectTitle}</div>
                  </TableCell>
                  <TableCell>{p.workCategory}</TableCell>
                  <TableCell>{formatINR(p.feePaise, { paise: false })}</TableCell>
                  <TableCell>
                    {p.belowMinimum ? (
                      <Tag type="magenta" size="sm">
                        Below COA min
                      </Tag>
                    ) : (
                      <Tag type="green" size="sm">
                        OK
                      </Tag>
                    )}
                  </TableCell>
                  <TableCell>
                    <FeeProposalPdfCell feeId={p.id} initialStatus={p.pdfStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading="New proposal"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !projectId || !cost || !fee || (below && !override) || create.isPending
        }
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            workCategory: category as CoaWorkCategory,
            workType: workType as (typeof ProjectWorkType.options)[number],
            costOfWorksPaise: costPaise,
            feePaise,
            docCommPct: Number(docComm || "10"),
            scope: scope || undefined,
            notes: notes || undefined,
            overrideReason: override || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="fp-proj"
            labelText="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <SelectItem value="" text="Select a project…" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={4}>
            <Select
              id="fp-cat"
              labelText="Work category (COA)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {Object.values(CoaWorkCategory).map((c) => (
                <SelectItem key={c} value={c} text={c} />
              ))}
            </Select>
            <Select
              id="fp-wt"
              labelText="Work type"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
            >
              {ProjectWorkType.options.map((w) => (
                <SelectItem key={w} value={w} text={w} />
              ))}
            </Select>
          </Stack>
          <Stack orientation="horizontal" gap={4}>
            <TextInput
              id="fp-cost"
              labelText="Cost of works (₹)"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <TextInput
              id="fp-fee"
              labelText="Professional fee (₹)"
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <TextInput
              id="fp-dc"
              labelText="Doc & comm %"
              type="number"
              value={docComm}
              onChange={(e) => setDocComm(e.target.value)}
            />
          </Stack>
          {coaMin > 0 && (
            <div>
              COA minimum ≈ {formatINR(coaMin, { paise: false })}
              {below ? " — quoted fee is below the COA minimum." : ""}
            </div>
          )}
          {below && (
            <TextInput
              id="fp-or"
              labelText="Override reason (required below COA minimum)"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
            />
          )}
          <TextArea
            id="fp-scope"
            labelText="Scope (optional)"
            rows={3}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
          <TextArea
            id="fp-notes"
            labelText="Notes (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {create.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={create.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
