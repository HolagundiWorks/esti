/**
 * Assemble the working model into a frozen, sealed `.aormsest` (EstimateFile).
 */
import {
  EstimateFile,
  computeMemberBBS,
  estimateSealString,
  recostEstimate,
  steelFromBBS,
  type CostedEstimate,
  type EstimateItem,
  type RateBookRates,
} from "@esti/contracts";
import { itemQty } from "./itemQty.js";
import { measureQtyFromTemplate } from "./measurement.js";
import { computeMaterialsFromItems } from "./materialExtract.js";
import type { EstimateModel } from "./model.js";
import type { RateBookIndex } from "./rateBookIndex.js";

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const amount = (qty: number, ratePaise: number) => Math.round(qty * ratePaise);

export function modelToDraft(
  model: EstimateModel,
  createdAtISO: string,
  rateBookIndex: RateBookIndex | null,
): Omit<EstimateFile, "checksum"> {
  const items: EstimateItem[] = model.items.map((it) => {
    const qty = itemQty(it);
    const template = it.measurementTemplate;
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
        qty: template
          ? measureQtyFromTemplate(m, template)
          : round3((m.nos ?? 1) * (m.l ?? 1) * (m.b ?? 1) * (m.h ?? 1)),
      })),
      qty,
      amountPaise: base + lead,
      lead: leadChargePaise ? { km: it.leadKm, chargePaise: leadChargePaise } : undefined,
      section: it.section,
      derivedFrom: it.derivedFrom,
    };
  });

  const computedMaterials = computeMaterialsFromItems(model.items, rateBookIndex);
  const materials =
    computedMaterials.length > 0
      ? computedMaterials.map((m) => ({
          code: m.code,
          name: m.name,
          unit: m.unit,
          qty: m.qty,
          ratePaise: m.ratePaise,
          amountPaise: m.ratePaise != null ? amount(m.qty, m.ratePaise) : undefined,
        }))
      : model.materials.map((m) => ({
          code: m.code,
          name: m.name,
          unit: m.unit,
          qty: m.qty,
          ratePaise: m.ratePaise,
          amountPaise: m.ratePaise != null ? amount(m.qty, m.ratePaise) : undefined,
        }));

  const members = model.bbs.map((b) => computeMemberBBS(b));
  const steel = steelFromBBS(members, model.steelRatePaiseByDia);

  return {
    formatVersion: 1,
    meta: {
      estimateName: model.estimateName || "Estimate",
      projectName: model.projectName || undefined,
      createdAt: createdAtISO,
      appVersion: "0.2.0",
      currency: "INR",
    },
    rateBook: {
      code: model.rateBookCode || rateBookIndex?.pack.edition || "OWN",
      name: model.rateBookName || rateBookIndex?.pack.source || "Office rate book",
    },
    items,
    materials,
    steel,
  };
}

export async function sealEstimate(draft: Omit<EstimateFile, "checksum">): Promise<EstimateFile> {
  const bytes = new TextEncoder().encode(estimateSealString(draft as Record<string, unknown>));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return EstimateFile.parse({ ...draft, checksum });
}

export function previewCost(draft: Omit<EstimateFile, "checksum">): CostedEstimate {
  const rb: RateBookRates = {
    code: "SELF",
    name: "As estimated",
    itemRatePaise: {},
    materialRatePaise: {},
    steelRatePaiseByDia: {},
  };
  return recostEstimate({ ...draft, checksum: "" }, rb);
}
