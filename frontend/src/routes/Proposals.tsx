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
  FEE_BASIS_LABEL,
  type FeeBasis,
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
  const [feeBasis, setFeeBasis] = useState<FeeBasis>("COA_PERCENT");
  const [cost, setCost] = useState("");
  const [fee, setFee] = useState("");
  const [area, setArea] = useState("");
  const [rate, setRate] = useState("");
  const [docComm, setDocComm] = useState("10");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState("");

  const create = trpc.proposals.create.useMutation({
    onSuccess: () => {
      utils.proposals.listAll.invalidate();
      setOpen(false);
      setProjectId("");
      setFeeBasis("COA_PERCENT");
      setCost("");
      setFee("");
      setArea("");
      setRate("");
      setOverride("");
      setScope("");
      setNotes("");
    },
  });

  const costPaise = Math.round(Number(cost || "0") * 100);
  const ratePaise = Math.round(Number(rate || "0") * 100);
  const areaNum = Number(area || "0");
  const feePaise =
    feeBasis === "PER_SQM"
      ? Math.round(areaNum * ratePaise)
      : Math.round(Number(fee || "0") * 100);
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
          !projectId ||
          (feeBasis === "COA_PERCENT" && !cost) ||
          (feeBasis === "PER_SQM" ? !(areaNum > 0 && ratePaise > 0) : feePaise <= 0) ||
          (below && !override) ||
          create.isPending
        }
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            workCategory: category as CoaWorkCategory,
            workType: workType as (typeof ProjectWorkType.options)[number],
            feeBasis,
            costOfWorksPaise: costPaise,
            feePaise,
            builtUpAreaSqm: feeBasis === "PER_SQM" ? areaNum : undefined,
            ratePerSqmPaise: feeBasis === "PER_SQM" ? ratePaise : undefined,
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
          <Select
            id="fp-basis"
            labelText="Fee basis"
            value={feeBasis}
            onChange={(e) => setFeeBasis(e.target.value as FeeBasis)}
          >
            {Object.entries(FEE_BASIS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value} text={label} />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={4}>
            <TextInput
              id="fp-cost"
              labelText={
                feeBasis === "COA_PERCENT"
                  ? "Cost of works (₹)"
                  : "Cost of works (₹, COA benchmark)"
              }
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            {feeBasis === "PER_SQM" ? (
              <>
                <TextInput
                  id="fp-area"
                  labelText="Built-up area (sq.m)"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
                <TextInput
                  id="fp-rate"
                  labelText="Rate (₹ / sq.m)"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </>
            ) : (
              <TextInput
                id="fp-fee"
                labelText={feeBasis === "LUMPSUM" ? "Lumpsum fee (₹)" : "Professional fee (₹)"}
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            )}
            <TextInput
              id="fp-dc"
              labelText="Doc & comm %"
              type="number"
              value={docComm}
              onChange={(e) => setDocComm(e.target.value)}
            />
          </Stack>
          {feeBasis === "PER_SQM" && feePaise > 0 && (
            <div>Computed fee ≈ {formatINR(feePaise, { paise: false })}</div>
          )}
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
