/**
 * Assemble the working model into a frozen, sealed `.aormsest` (EstimateFile),
 * and re-cost the model for live preview. Pure over the model; the only IO is the
 * Web Crypto sha256 seal (works in the browser and in Node — both expose
 * globalThis.crypto.subtle). Reuses the shared engine in @esti/contracts.
 */
import {
  EstimateFile,
  computeMemberBBS,
  estimateSealString,
  measureQty,
  recostEstimate,
  steelFromBBS,
  type CostedEstimate,
  type EstimateItem,
  type RateBookRates,
} from "@esti/contracts";
import type { EstimateModel } from "./model.js";

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const amount = (qty: number, ratePaise: number) => Math.round(qty * ratePaise);

/** Sum a work item's measurement rows into a frozen quantity. */
function itemQty(item: EstimateModel["items"][number]): number {
  return round3(
    item.measurements.reduce((s, m) => s + measureQty({ nos: m.nos, l: m.l, b: m.b, h: m.h }), 0),
  );
}

/** Model → EstimateFile WITHOUT the checksum (sealEstimate adds it). */
export function modelToDraft(model: EstimateModel, createdAtISO: string): Omit<EstimateFile, "checksum"> {
  const items: EstimateItem[] = model.items.map((it) => {
    const qty = itemQty(it);
    const leadChargePaise = it.leadChargePaise ?? 0;
    const base = amount(qty, it.ratePaise);
    const lead = amount(qty, leadChargePaise);
    return {
      code: it.code,
      itemCode: it.itemCode,
      shortName: it.shortName || it.code,
      specification: it.specification,
      attributes: {},
      uom: it.uom,
      ratePaise: it.ratePaise,
      measurements: it.measurements.map((m) => ({
        desc: m.desc,
        nos: m.nos,
        l: m.l,
        b: m.b,
        h: m.h,
        qty: measureQty({ nos: m.nos, l: m.l, b: m.b, h: m.h }),
      })),
      qty,
      amountPaise: base + lead,
      lead: leadChargePaise ? { km: it.leadKm, chargePaise: leadChargePaise } : undefined,
      section: it.section,
    };
  });

  const members = model.bbs.map((b) => computeMemberBBS(b));
  const steel = steelFromBBS(members, model.steelRatePaiseByDia);

  return {
    formatVersion: 1,
    meta: {
      estimateName: model.estimateName || "Estimate",
      projectName: model.projectName || undefined,
      createdAt: createdAtISO,
      appVersion: "0.1.0",
      currency: "INR",
    },
    rateBook: { code: model.rateBookCode || "OWN", name: model.rateBookName || "Office rate book" },
    items,
    materials: model.materials.map((m) => ({
      code: m.code,
      name: m.name,
      unit: m.unit,
      qty: m.qty,
      ratePaise: m.ratePaise,
      amountPaise: m.ratePaise != null ? amount(m.qty, m.ratePaise) : undefined,
    })),
    steel,
  };
}

/** Seal a draft with a sha256 of its canonical content → a valid EstimateFile. */
export async function sealEstimate(draft: Omit<EstimateFile, "checksum">): Promise<EstimateFile> {
  const bytes = new TextEncoder().encode(estimateSealString(draft as Record<string, unknown>));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return EstimateFile.parse({ ...draft, checksum });
}

/** Re-cost the model against its own as-estimated rates (live preview; the
 *  project rate book lives in AORMS). */
export function previewCost(draft: Omit<EstimateFile, "checksum">): CostedEstimate {
  const rb: RateBookRates = { code: "SELF", name: "As estimated", itemRatePaise: {}, materialRatePaise: {}, steelRatePaiseByDia: {} };
  return recostEstimate({ ...draft, checksum: "" }, rb);
}
