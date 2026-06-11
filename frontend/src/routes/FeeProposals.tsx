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
  coaMinimumFee,
  formatINR,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { FeeProposalPdfCell } from "../components/FeeProposalPdfCell.js";
import { trpc } from "../lib/trpc.js";

export function FeeProposals() {
  const utils = trpc.useUtils();
  const listQ = trpc.feeProposals.listAll.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState<string>(
    Object.values(CoaWorkCategory)[0] as string,
  );
  const [cost, setCost] = useState("");
  const [fee, setFee] = useState("");
  const [docComm, setDocComm] = useState("10");
  const [scope, setScope] = useState("");
  const [override, setOverride] = useState("");

  const create = trpc.feeProposals.create.useMutation({
    onSuccess: () => {
      utils.feeProposals.listAll.invalidate();
      setOpen(false);
      setProjectId("");
      setCost("");
      setFee("");
      setOverride("");
      setScope("");
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
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1>Fee proposals</h1>
          <p>COA scale-of-charges proposals across all projects.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New fee proposal</Button>
      </div>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: "No fee proposals",
          description: "Prepare a COA-benchmarked fee proposal for a project.",
          action: (
            <Button size="sm" onClick={() => setOpen(true)}>
              New fee proposal
            </Button>
          ),
        }}
      >
        <TableContainer title="All fee proposals">
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
                  <TableCell>
                    {formatINR(p.feePaise, { paise: false })}
                  </TableCell>
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
                    <FeeProposalPdfCell
                      feeId={p.id}
                      initialStatus={p.pdfStatus}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading="New fee proposal"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !projectId ||
          !cost ||
          !fee ||
          (below && !override) ||
          create.isPending
        }
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            workCategory: category as CoaWorkCategory,
            costOfWorksPaise: costPaise,
            feePaise,
            docCommPct: Number(docComm || "10"),
            scope: scope || undefined,
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
              <SelectItem
                key={p.id}
                value={p.id}
                text={`${p.ref} — ${p.title}`}
              />
            ))}
          </Select>
          <Select
            id="fp-cat"
            labelText="Work category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.values(CoaWorkCategory).map((c) => (
              <SelectItem key={c} value={c} text={c} />
            ))}
          </Select>
          <div style={{ display: "flex", gap: 12 }}>
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
          </div>
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
    </div>
  );
}
