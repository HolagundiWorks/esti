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
  DEVIATION_SEVERITY_LABEL,
  DEVIATION_STATUS_LABEL,
  REASON_SOURCE_LABEL,
  type DeviationSeverity,
  type DeviationStatus,
  type RateLadderRow,
  can,
  deviationSeverity,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";

const SEVERITY_TAG: Record<DeviationSeverity, "green" | "purple" | "red"> = {
  WITHIN_LIMIT: "green",
  WARNING: "purple",
  APPROVAL_REQUIRED: "red",
};

const STATUS_TAG: Record<DeviationStatus, "blue" | "green" | "red"> = {
  OPEN: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

/** ₹ text → integer paise. */
function toPaise(rupees: string): number {
  return Math.round(Number(rupees || "0") * 100);
}

/** A rate rung, or an em-dash when that stage doesn't exist for the line. */
function rung(paise: number | null) {
  return paise == null ? "—" : formatINR(paise);
}

/** A signed hop %, or an em-dash when its baseline rung is absent. */
function hop(pct: number | null) {
  return pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct}%`;
}

/**
 * Construction Cost OS 3.4 — the rate-deviation ladder. Every work-package line's
 * rate journey across the spine: estimated (design estimate) → tendered (office
 * BOQ baseline) → awarded (winning bid) → revised (latest non-rejected RATE
 * deviation), with the per-hop deviation and the active deviation's status. Read-
 * only and advisory: a revised rate reaches bills only via a variation (Rule 5).
 * Raising a rate deviation here reuses the existing Phase-D create flow.
 */
export function ProjectRateLadder({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const utils = trpc.useUtils();

  const ladderQ = trpc.deviations.rateLadder.useQuery({ projectId });
  const rows = ladderQ.data?.rows ?? [];

  const create = trpc.deviations.create.useMutation({
    onSuccess: () => void utils.deviations.rateLadder.invalidate({ projectId }),
  });

  const [raiseRow, setRaiseRow] = useState<RateLadderRow | null>(null);
  const [revisedRate, setRevisedRate] = useState("");
  const [reason, setReason] = useState("");
  const [reasonSource, setReasonSource] = useState("MARKET_RATE");

  const openRaise = (row: RateLadderRow) => {
    setRaiseRow(row);
    setRevisedRate(row.awardedPaise != null ? String(row.awardedPaise / 100) : "");
    setReason("");
    setReasonSource("MARKET_RATE");
  };
  const canRaise = !!raiseRow && revisedRate !== "" && reason.trim().length >= 2;

  return (
    <div>
      <Stack gap={2}>
        <p className="esti-label--secondary">
          Each work-package line's rate journey — estimated → tendered → awarded → revised — with the
          per-stage deviation. The ladder is advisory: a revised rate is documented and approved here
          but only reaches bills via a variation order (Rule 5).
        </p>
      </Stack>

      <Stack gap={5} style={{ marginTop: "var(--cds-spacing-05)" }}>
        <DataState
          loading={ladderQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={8}
          empty={{
            title: "No work-package lines yet",
            description:
              "Award a tender into a work package to see the estimated → tendered → awarded → revised rate ladder here.",
          }}
        >
          <TableContainer
            title="Rate ladder"
            description="Per-unit rates across the spine. Revised is the latest non-rejected rate deviation; a line never estimated or tendered shows that rung as an em-dash."
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Package</TableHeader>
                  <TableHeader>BOQ line</TableHeader>
                  <TableHeader>Estimated</TableHeader>
                  <TableHeader>Tendered</TableHeader>
                  <TableHeader>Awarded</TableHeader>
                  <TableHeader>Revised</TableHeader>
                  <TableHeader>Rate deviation</TableHeader>
                  <TableHeader>Status</TableHeader>
                  {canWrite && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const hasRevision = r.revisedPaise != null;
                  const sev = hasRevision
                    ? deviationSeverity(r.hops.awardToRevisedPct ?? 0)
                    : null;
                  return (
                    <TableRow key={r.workPackageItemId}>
                      <TableCell>{r.ref}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{rung(r.estimatedPaise)}</TableCell>
                      <TableCell>{rung(r.tenderedPaise)}</TableCell>
                      <TableCell>{rung(r.awardedPaise)}</TableCell>
                      <TableCell>{rung(r.revisedPaise)}</TableCell>
                      <TableCell>
                        {hasRevision && sev ? (
                          <Stack gap={1}>
                            <span>{hop(r.hops.awardToRevisedPct)}</span>
                            <Tag size="sm" type={SEVERITY_TAG[sev]}>
                              {DEVIATION_SEVERITY_LABEL[sev]}
                            </Tag>
                          </Stack>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {r.deviation ? (
                          <Tag size="sm" type={STATUS_TAG[r.deviation.status]}>
                            {r.deviation.ref} · {DEVIATION_STATUS_LABEL[r.deviation.status]}
                          </Tag>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <Button size="sm" kind="ghost" onClick={() => openRaise(r)}>
                            Raise rate deviation
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      </Stack>

      <Modal
        open={raiseRow !== null}
        modalHeading="Raise rate deviation"
        primaryButtonText={create.isPending ? "Recording..." : "Record deviation"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canRaise || create.isPending}
        onRequestClose={() => setRaiseRow(null)}
        onRequestSubmit={() => {
          if (!raiseRow) return;
          create.mutate(
            {
              projectId,
              workPackageId: raiseRow.workPackageId,
              workPackageItemId: raiseRow.workPackageItemId,
              type: "RATE",
              revisedRatePaise: toPaise(revisedRate),
              reason: reason.trim(),
              reasonSource: reasonSource as never,
            },
            { onSuccess: () => setRaiseRow(null) },
          );
        }}
      >
        <Stack gap={5}>
          {create.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not record deviation"
              subtitle={create.error.message}
            />
          )}
          {raiseRow && (
            <p className="esti-label--secondary">
              {raiseRow.ref} — {raiseRow.description}. Awarded contract rate{" "}
              {rung(raiseRow.awardedPaise)} (never overwritten — a revised rate reaches bills only
              via a variation).
            </p>
          )}
          <TextInput
            id="ladder-revised-rate"
            labelText="Revised rate (₹)"
            type="number"
            value={revisedRate}
            onChange={(e) => setRevisedRate(e.target.value)}
          />
          <Select
            id="ladder-reason-source"
            labelText="Reason source"
            value={reasonSource}
            onChange={(e) => setReasonSource(e.target.value)}
          >
            {Object.entries(REASON_SOURCE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} text={v} />
            ))}
          </Select>
          <TextArea
            id="ladder-reason"
            labelText="Reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </Modal>
    </div>
  );
}
