import {
  Button,
  Checkbox,
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
  TextInput,
} from "@carbon/react";
import {
  GstSystem,
  InvoiceStatus,
  SAC_CODES,
  can,
  computeGst,
  computeTds194j,
  formatINR,
} from "@esti/contracts";
import type { PeriodFilterInput } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { InvoicePdfCell } from "../components/InvoicePdfCell.js";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { PeriodFilter } from "../components/PeriodFilter.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  PAID: "green",
  CANCELLED: "red",
};

export function Invoices() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canInvoice = can(user?.role, "invoice:manage");
  const [period, setPeriod] = useState<PeriodFilterInput>({ preset: "CURRENT_FY" });
  const listQ = trpc.invoices.listAll.useQuery({ period });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const firmQ = trpc.firm.get.useQuery();
  const firmGst = (firmQ.data?.gstType ?? GstSystem.REGULAR) as GstSystem;
  const firmTdsDefault = firmQ.data?.tdsApplicableDefault ?? true;

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [taxableR, setTaxableR] = useState("");
  const [inter, setInter] = useState(false);
  const [isAdvance, setIsAdvance] = useState(false);
  const [sac, setSac] = useState<string>(SAC_CODES[0]?.code ?? "998321");

  const create = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.listAll.invalidate();
      utils.dashboard.home.invalidate();
      setOpen(false);
      setTaxableR("");
      setProjectId("");
      setIsAdvance(false);
    },
  });
  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoices.listAll.invalidate();
      utils.dashboard.home.invalidate();
    },
  });

  const taxablePaise = Math.round(Number(taxableR || "0") * 100);
  const breakup = computeGst(firmGst, taxablePaise, inter);
  const tdsPaise = firmTdsDefault ? computeTds194j(taxablePaise) : 0;
  const net = breakup.grandTotal - tdsPaise;
  const showSac = firmGst === GstSystem.REGULAR;

  return (
    <Stack gap={6}>
      <PageHeader
        title="Invoices"
        description="GST tax invoices &amp; bills of supply across all projects."
        actions={
          canInvoice ? (
            <Button onClick={() => setOpen(true)}>New invoice</Button>
          ) : undefined
        }
      />

      <PeriodFilter value={period} onChange={setPeriod} />

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={8}
        empty={{
          title: "No invoices yet",
          description: "Raise an invoice against any project.",
          action: canInvoice ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              New invoice
            </Button>
          ) : undefined,
        }}
      >
        <TableContainer title="All invoices" description="Office-wide">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Document</TableHeader>
                <TableHeader>Taxable</TableHeader>
                <TableHeader>GST</TableHeader>
                <TableHeader>Net</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Document</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((iv) => (
                <TableRow key={iv.id}>
                  <TableCell>{iv.ref}</TableCell>
                  <TableCell>
                    <Link to={`/projects/${iv.projectId}?tab=invoices`}>
                      {iv.projectRef}
                    </Link>
                    <div>{iv.projectTitle}</div>
                  </TableCell>
                  <TableCell>{iv.documentKind}</TableCell>
                  <TableCell>
                    {formatINR(iv.taxablePaise, { paise: false })}
                  </TableCell>
                  <TableCell>
                    {formatINR(iv.gstTotalPaise, { paise: false })}
                  </TableCell>
                  <TableCell>
                    {formatINR(iv.netReceivablePaise, { paise: false })}
                  </TableCell>
                  <TableCell>
                    <Select
                      id={`inv-st-${iv.id}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={iv.status}
                      disabled={
                        !canInvoice ||
                        iv.status === "PAID" ||
                        iv.status === "CANCELLED"
                      }
                      onChange={(e) =>
                        updateStatus.mutate({
                          id: iv.id,
                          status: e.target
                            .value as (typeof InvoiceStatus.options)[number],
                        })
                      }
                    >
                      {InvoiceStatus.options.map((st) => (
                        <SelectItem key={st} value={st} text={st} />
                      ))}
                    </Select>
                    <Tag
                      type={STATUS_TAG[iv.status] ?? "gray"}
                      size="sm"
                    >
                      {iv.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <InvoicePdfCell
                      invoiceId={iv.id}
                      initialStatus={iv.pdfStatus}
                      canManage={canInvoice}
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
        modalHeading="New invoice (GST / TDS)"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!projectId || !taxableR || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            taxablePaise,
            interState: inter,
            isAdvance,
            sac: showSac ? sac : undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="gi-proj"
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
          <div>
            GST system: <strong>{firmGst}</strong> (from Company settings)
          </div>
          <TextInput
            id="gi-tax"
            labelText="Taxable value (₹)"
            type="number"
            value={taxableR}
            onChange={(e) => setTaxableR(e.target.value)}
          />
          {showSac && (
            <Select
              id="gi-sac"
              labelText="SAC code"
              value={sac}
              onChange={(e) => setSac(e.target.value)}
            >
              {SAC_CODES.map((s) => (
                <SelectItem
                  key={s.code}
                  value={s.code}
                  text={`${s.code} — ${s.label}`}
                />
              ))}
            </Select>
          )}
          <Checkbox
            id="gi-inter"
            labelText="Inter-state (IGST)"
            checked={inter}
            onChange={(_, { checked }) => setInter(checked)}
          />
          <Checkbox
            id="gi-advance"
            labelText="Advance invoice (gates project activation when paid)"
            checked={isAdvance}
            onChange={(_, { checked }) => setIsAdvance(checked)}
          />
          <div>
            TDS u/s 194J:{" "}
            <strong>
              {firmTdsDefault ? "deducted (10%)" : "not applicable"}
            </strong>{" "}
            (from Company settings)
          </div>
          {taxablePaise > 0 && (
            <div>
              {breakup.documentKind} · GST{" "}
              {formatINR(breakup.gstTotal, { paise: false })} · TDS{" "}
              {formatINR(tdsPaise, { paise: false })} · Net{" "}
              <strong>{formatINR(net, { paise: false })}</strong>
            </div>
          )}
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
