/**
 * Shared Studio invoice creation — GST/TDS/place-of-supply snapshot.
 * Used by `invoices.create` and consultancy fee-stage `markInvoiced`.
 */
import {
  GstSystem,
  InvoiceCreate,
  computeGst,
  computeTds194j,
  derivePlaceOfSupply,
  financialYearRange,
  tds194jApplies,
  type PlaceOfSupply,
} from "@esti/contracts";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { clients, invoices, projectOffices } from "../db/schema.js";
import { writeActivity } from "./activity.js";
import { writeAudit } from "./audit.js";
import { firmPayload, getFirm } from "./firm.js";
import { nextRef } from "./numbering.js";
import { requireInvoiceScope } from "./projectScope.js";
import { enqueueJob } from "./redis.js";
import { publishEntity } from "./sync/publish.js";

export type InvoiceActor = { id: string; fullName: string };

/** Fee value (excluding GST) already invoiced to a client this financial year. */
async function clientFyTaxablePaise(db: DB, clientId: string): Promise<number> {
  const { start, end } = financialYearRange();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${invoices.taxablePaise}), 0)::bigint` })
    .from(invoices)
    .where(
      and(
        eq(invoices.clientId, clientId),
        inArray(invoices.status, ["DRAFT", "ISSUED", "PAID"]),
        gte(invoices.createdAt, start),
        lt(invoices.createdAt, end),
      ),
    );
  return Number(row?.total ?? 0);
}

async function derivePlaceOfSupplyForInvoice(
  db: DB,
  firm: { state?: string | null; gstin?: string | null },
  input: { projectId: string; clientId?: string | null },
): Promise<PlaceOfSupply> {
  const [project] = await db
    .select({ state: projectOffices.state })
    .from(projectOffices)
    .where(eq(projectOffices.id, input.projectId));
  const client = input.clientId
    ? (
        await db
          .select({ state: clients.state, gstin: clients.gstin })
          .from(clients)
          .where(eq(clients.id, input.clientId))
      )[0]
    : undefined;
  return derivePlaceOfSupply({
    firmState: firm.state ?? null,
    firmGstin: firm.gstin ?? null,
    projectState: project?.state ?? null,
    clientState: client?.state ?? null,
    clientGstin: client?.gstin ?? null,
  });
}

export type CreateStudioInvoiceOpts = {
  input: InvoiceCreate;
  actor: InvoiceActor;
  requestId?: string;
  /**
   * When true, insert as ISSUED with invoice date + PDF pending, enqueue
   * render, and publish to the hub (fee-stage "mark invoiced" path).
   */
  issue?: boolean;
};

/**
 * Create a Studio invoice with the frozen tax snapshot. Callers that already
 * validated scope may pass `skipScopeCheck` via requireInvoiceScope separately;
 * this always runs `requireInvoiceScope` for safety.
 */
export async function createStudioInvoice(db: DB, opts: CreateStudioInvoiceOpts) {
  const { input, actor, requestId, issue = false } = opts;
  await requireInvoiceScope(db, input);
  const firm = await getFirm(db);
  const system = input.gstSystem ?? (firm.gstType as GstSystem);
  const sac = system === GstSystem.REGULAR ? (input.sac ?? null) : null;
  const pos = await derivePlaceOfSupplyForInvoice(db, firm, input);
  const interState = input.interState ?? pos.interState;

  const firmDeducts = input.tdsApplicable ?? firm.tdsApplicableDefault;
  const priorTaxablePaise = input.clientId
    ? await clientFyTaxablePaise(db, input.clientId)
    : 0;
  const tdsCheck = tds194jApplies({ priorTaxablePaise, taxablePaise: input.taxablePaise });
  const tdsApplicable = firmDeducts && tdsCheck.applies;

  const g = computeGst(system, input.taxablePaise, interState);
  const tdsPaise = tdsApplicable ? computeTds194j(input.taxablePaise) : 0;
  const netReceivablePaise = g.grandTotal - tdsPaise;
  const { ref } = await nextRef(db, "invoice", "INV");
  const today = new Date().toISOString().slice(0, 10);

  const [row] = await db
    .insert(invoices)
    .values({
      ref,
      projectId: input.projectId,
      phaseId: input.phaseId ?? null,
      clientId: input.clientId ?? null,
      status: issue ? "ISSUED" : "DRAFT",
      gstSystem: system,
      documentKind: g.documentKind,
      sac,
      interState,
      placeOfSupplyState: pos.state,
      tdsApplicable,
      taxablePaise: g.taxable,
      cgstPaise: g.cgst,
      sgstPaise: g.sgst,
      igstPaise: g.igst,
      gstTotalPaise: g.gstTotal,
      compositionLevyPaise: g.compositionLevy,
      tdsPaise,
      grandTotalPaise: g.grandTotal,
      netReceivablePaise,
      isAdvance: input.isAdvance,
      dateInvoice: issue ? (input.dateInvoice ?? today) : (input.dateInvoice ?? null),
      notes: input.notes ?? null,
      ...(issue ? { pdfStatus: "PENDING" as const } : {}),
    })
    .returning();

  await writeAudit(db, {
    entity: "invoice",
    entityId: row!.id,
    action: "CREATE",
    actorId: actor.id,
    after: row,
  });
  await writeActivity(db, {
    projectId: row!.projectId,
    objectType: "invoice",
    objectId: row!.id,
    eventType: "invoice.created",
    actorId: actor.id,
    actorName: actor.fullName,
    summary: issue
      ? `Invoice ${row!.ref} raised (ISSUED)`
      : `Invoice ${row!.ref} created`,
    metadata: { ref: row!.ref, status: row!.status, taxablePaise: row!.taxablePaise },
  });

  if (issue) {
    await enqueueJob(
      "render_pdf",
      {
        documentKind: row!.documentKind,
        id: row!.id,
        firm: await firmPayload(db),
      },
      requestId,
    );
    await publishEntity(db, "invoice", row!.id);
  }

  return row!;
}
