import {
  summarizeProcurementForecast,
  type ProcurementForecast,
  type ProcurementForecastItemLike,
} from "@esti/contracts";
import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/**
 * Construction Cost OS — Procurement Forecast read model (ref 5.16).
 *
 * The forward look over the spine: for every work-package item, the contracted
 * quantity (approved + variation) less everything billed against it is the
 * outstanding quantity still to be procured / executed, valued at the awarded
 * rate. Cost head comes from the linked estimate item. All the arithmetic and
 * the by-cost-head / by-package rollups live in the pure
 * `summarizeProcurementForecast` helper; this function only assembles the rows.
 *
 * Read-only — no writes, no AI call. Mirrors the Phase-G item query in
 * `constructionCost.ts` (cumulative billed qty per WP item).
 */
export interface ProcurementForecastResult extends ProcurementForecast {
  generatedAt: string;
}

export async function getProcurementForecast(
  db: DB,
  projectId: string,
): Promise<ProcurementForecastResult> {
  const rows = (await db.execute(sql`
    select
      wp.id   as work_package_id,
      wp.ref  as work_package_ref,
      wp.name as work_package_name,
      c.name  as contractor,
      wpi.description,
      wpi.unit,
      ei.cost_head as cost_head,
      (wpi.approved_qty + wpi.variation_qty) as contracted_qty,
      wpi.rate_paise as rate_paise,
      coalesce((
        select sum(rbi.qty) from esti_running_bill_item rbi
        join esti_running_bill rb on rb.id = rbi.running_bill_id
        where rb.project_id = ${projectId} and rbi.work_package_item_id = wpi.id
      ), 0) as billed_qty
    from esti_work_package_item wpi
    join esti_work_package wp on wp.id = wpi.work_package_id
    left join esti_contractor c on c.id = wp.contractor_id
    left join esti_estimate_item ei on ei.id = wpi.boq_item_id
    where wp.project_id = ${projectId}
  `)) as unknown as {
    work_package_id: string;
    work_package_ref: string;
    work_package_name: string;
    contractor: string | null;
    description: string;
    unit: string;
    cost_head: string | null;
    contracted_qty: number;
    rate_paise: number;
    billed_qty: number;
  }[];

  const items: ProcurementForecastItemLike[] = rows.map((r) => ({
    workPackageId: r.work_package_id,
    workPackageRef: r.work_package_ref,
    workPackageName: r.work_package_name,
    contractor: r.contractor,
    description: r.description,
    unit: r.unit,
    costHead: r.cost_head,
    contractedQty: Number(r.contracted_qty),
    billedQty: Number(r.billed_qty),
    ratePaise: Number(r.rate_paise),
  }));

  return {
    ...summarizeProcurementForecast(items),
    generatedAt: new Date().toISOString(),
  };
}
