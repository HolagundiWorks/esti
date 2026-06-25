import {
  costOverrunPct,
  costStatusFor,
  deriveCostRiskNotes,
  type CostRiskItemLike,
  type CostRiskNote,
  type CostRiskPackageLike,
  type CostStatus,
} from "@esti/contracts";
import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/**
 * Construction Cost OS Phase G — per-project cost-health read model (ref 5.1).
 *
 * Rolls the whole spine back into one calm picture: estimated vs tendered vs
 * awarded vs billed vs certified, deviation/variation exposure, a cost-overrun %,
 * Green/Amber/Red/Grey status per work package and per contractor, plus the three
 * deterministic risk checks (duplicate/over-billing, unbalanced bid, bill
 * deviation). Read-only — no writes, no AI call; the risk notes are arithmetic
 * "checker" output, never an auto-approval.
 */

export interface CostPackageRow {
  id: string;
  ref: string;
  name: string;
  contractor: string | null;
  awardedPaise: number;
  variationPaise: number;
  billedPaise: number;
  openDeviations: number;
  status: CostStatus;
}

export interface CostContractorRow {
  id: string;
  name: string;
  billedPaise: number;
  certifiedPaise: number;
  pendingBills: number;
}

export interface ConstructionCostHealth {
  kpis: {
    estimatedPaise: number;
    tenderedPaise: number;
    awardedPaise: number;
    billedGrossPaise: number;
    certifiedNetPaise: number;
    pendingBillsCount: number;
    pendingBillsPaise: number;
    approvedDeviations: { count: number; valuePaise: number };
    unapprovedDeviations: { count: number; valuePaise: number };
    variationValuePaise: number;
  };
  overrunPct: number | null;
  packages: CostPackageRow[];
  contractors: CostContractorRow[];
  riskNotes: CostRiskNote[];
  generatedAt: string;
}

/** Running-bill statuses that count as certified-for-payment. */
const CERTIFIED = sql`('OFFICE_APPROVED', 'SENT_TO_CLIENT')`;

export async function getConstructionCostHealth(
  db: DB,
  projectId: string,
): Promise<ConstructionCostHealth> {
  // --- Estimated: the estimate(s) the work packages were carved from; if none
  // contracted yet, fall back to the project's non-DRAFT estimates. ----------
  const [est] = (await db.execute(sql`
    select coalesce(sum(total_paise), 0)::bigint as estimated_paise
    from esti_estimate
    where id in (select distinct estimate_id from esti_work_package where project_id = ${projectId})
  `)) as unknown as [{ estimated_paise: number }];
  let estimatedPaise = Number(est?.estimated_paise ?? 0);
  if (estimatedPaise === 0) {
    const [fallback] = (await db.execute(sql`
      select coalesce(sum(total_paise), 0)::bigint as estimated_paise
      from esti_estimate
      where project_id = ${projectId} and status <> 'DRAFT'
    `)) as unknown as [{ estimated_paise: number }];
    estimatedPaise = Number(fallback?.estimated_paise ?? 0);
  }

  // --- Tendered: office baseline value of the project's tender BOQ. ----------
  const [tendered] = (await db.execute(sql`
    select coalesce(sum(round(ti.qty * ti.est_rate_paise)), 0)::bigint as tendered_paise
    from esti_tender_item ti
    join esti_tender t on t.id = ti.tender_id
    where t.project_id = ${projectId}
  `)) as unknown as [{ tendered_paise: number }];

  // --- Awarded: contract value of the project's work packages. ---------------
  const [awarded] = (await db.execute(sql`
    select coalesce(sum(contract_value_paise), 0)::bigint as awarded_paise
    from esti_work_package
    where project_id = ${projectId}
  `)) as unknown as [{ awarded_paise: number }];

  // --- Bills: gross billed, certified net, pending count + value. ------------
  const [bills] = (await db.execute(sql`
    select
      coalesce(sum(total_paise), 0)::bigint                                                          as billed_gross,
      coalesce(sum(case when status in ${CERTIFIED} then net_payable_paise else 0 end), 0)::bigint   as certified_net,
      coalesce(sum(case when status not in ${CERTIFIED} then total_paise else 0 end), 0)::bigint      as pending_value,
      count(*) filter (where status not in ${CERTIFIED})::int                                         as pending_count
    from esti_running_bill
    where project_id = ${projectId}
  `)) as unknown as [{
    billed_gross: number; certified_net: number; pending_value: number; pending_count: number;
  }];

  // --- Deviations: approved vs unapproved (open) count + value. --------------
  const [dev] = (await db.execute(sql`
    select
      count(*) filter (where status = 'APPROVED')::int                                  as approved_count,
      coalesce(sum(cost_impact_paise) filter (where status = 'APPROVED'), 0)::bigint     as approved_value,
      count(*) filter (where status = 'OPEN')::int                                       as open_count,
      coalesce(sum(cost_impact_paise) filter (where status = 'OPEN'), 0)::bigint          as open_value
    from esti_deviation
    where project_id = ${projectId}
  `)) as unknown as [{
    approved_count: number; approved_value: number; open_count: number; open_value: number;
  }];

  // --- Variation value: approved/applied additions (not draft/rejected). -----
  const [varn] = (await db.execute(sql`
    select coalesce(sum(cost_impact_paise) filter (where status not in ('DRAFT', 'REJECTED')), 0)::bigint as variation_value
    from esti_variation
    where project_id = ${projectId}
  `)) as unknown as [{ variation_value: number }];

  // --- Package-wise rows. ----------------------------------------------------
  const pkgRows = (await db.execute(sql`
    select
      wp.id, wp.ref, wp.name, wp.status, wp.contract_value_paise,
      c.name as contractor_name,
      coalesce((
        select sum(cost_impact_paise) from esti_variation v
        where v.work_package_id = wp.id and v.status not in ('DRAFT', 'REJECTED')
      ), 0)::bigint as variation_paise,
      coalesce((
        select sum(total_paise) from esti_running_bill rb where rb.work_package_id = wp.id
      ), 0)::bigint as billed_paise,
      coalesce((
        select count(*) from esti_deviation d
        where d.work_package_id = wp.id and d.status = 'OPEN'
      ), 0)::int as open_deviations
    from esti_work_package wp
    left join esti_contractor c on c.id = wp.contractor_id
    where wp.project_id = ${projectId}
    order by wp.ref
  `)) as unknown as {
    id: string; ref: string; name: string; status: string;
    contract_value_paise: number; contractor_name: string | null;
    variation_paise: number; billed_paise: number; open_deviations: number;
  }[];

  const packages: CostPackageRow[] = pkgRows.map((r) => {
    const awardedPaise = Number(r.contract_value_paise);
    const variationPaise = Number(r.variation_paise);
    const billedPaise = Number(r.billed_paise);
    const openDeviations = Number(r.open_deviations);
    return {
      id: r.id,
      ref: r.ref,
      name: r.name,
      contractor: r.contractor_name,
      awardedPaise,
      variationPaise,
      billedPaise,
      openDeviations,
      status: costStatusFor({
        contractPaise: awardedPaise,
        variationPaise,
        billedPaise,
        openDeviations,
        started: r.status !== "DRAFT",
      }),
    };
  });

  // --- Contractor-wise rows. -------------------------------------------------
  const contractorRows = (await db.execute(sql`
    select
      c.id, c.name,
      coalesce(sum(rb.total_paise), 0)::bigint                                                        as billed,
      coalesce(sum(case when rb.status in ${CERTIFIED} then rb.net_payable_paise else 0 end), 0)::bigint as certified,
      count(*) filter (where rb.status not in ${CERTIFIED})::int                                       as pending
    from esti_running_bill rb
    join esti_contractor c on c.id = rb.contractor_id
    where rb.project_id = ${projectId}
    group by c.id, c.name
    order by billed desc
  `)) as unknown as {
    id: string; name: string; billed: number; certified: number; pending: number;
  }[];

  const contractors: CostContractorRow[] = contractorRows.map((r) => ({
    id: r.id,
    name: r.name,
    billedPaise: Number(r.billed),
    certifiedPaise: Number(r.certified),
    pendingBills: Number(r.pending),
  }));

  // --- Risk-check inputs: per WP item (over-billing + unbalanced), per package
  // (bill deviation). The over-billed quantity is the cumulative billed qty
  // against *this* WP item; the baseline is the item's estimate unit rate. -----
  const itemRows = (await db.execute(sql`
    select
      wpi.description, wpi.unit,
      (wpi.approved_qty + wpi.variation_qty) as contracted_qty,
      wpi.rate_paise as awarded_rate_paise,
      coalesce(ei.rate_paise, 0)::bigint as estimate_rate_paise,
      coalesce((
        select sum(rbi.qty) from esti_running_bill_item rbi
        join esti_running_bill rb on rb.id = rbi.running_bill_id
        where rb.project_id = ${projectId} and rbi.work_package_item_id = wpi.id
      ), 0) as cumulative_billed_qty
    from esti_work_package_item wpi
    join esti_work_package wp on wp.id = wpi.work_package_id
    left join esti_estimate_item ei on ei.id = wpi.boq_item_id
    where wp.project_id = ${projectId}
  `)) as unknown as {
    description: string; unit: string; contracted_qty: number;
    awarded_rate_paise: number; estimate_rate_paise: number; cumulative_billed_qty: number;
  }[];

  const riskItems: CostRiskItemLike[] = itemRows.map((r) => ({
    description: r.description,
    unit: r.unit,
    cumulativeBilledQty: Number(r.cumulative_billed_qty),
    contractedQty: Number(r.contracted_qty),
    awardedRatePaise: Number(r.awarded_rate_paise),
    estimateRatePaise: Number(r.estimate_rate_paise),
  }));

  const riskPackages: CostRiskPackageLike[] = packages.map((p) => ({
    name: p.name,
    ceilingPaise: p.awardedPaise + p.variationPaise,
    billedPaise: p.billedPaise,
  }));

  const riskNotes = deriveCostRiskNotes({ items: riskItems, packages: riskPackages });

  const awardedPaise = Number(awarded?.awarded_paise ?? 0);
  const variationValuePaise = Number(varn?.variation_value ?? 0);

  return {
    kpis: {
      estimatedPaise,
      tenderedPaise: Number(tendered?.tendered_paise ?? 0),
      awardedPaise,
      billedGrossPaise: Number(bills?.billed_gross ?? 0),
      certifiedNetPaise: Number(bills?.certified_net ?? 0),
      pendingBillsCount: Number(bills?.pending_count ?? 0),
      pendingBillsPaise: Number(bills?.pending_value ?? 0),
      approvedDeviations: {
        count: Number(dev?.approved_count ?? 0),
        valuePaise: Number(dev?.approved_value ?? 0),
      },
      unapprovedDeviations: {
        count: Number(dev?.open_count ?? 0),
        valuePaise: Number(dev?.open_value ?? 0),
      },
      variationValuePaise,
    },
    overrunPct: costOverrunPct({
      estimatedPaise,
      awardedPaise,
      variationPaise: variationValuePaise,
    }),
    packages,
    contractors,
    riskNotes,
    generatedAt: new Date().toISOString(),
  };
}
