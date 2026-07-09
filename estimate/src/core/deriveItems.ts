/**
 * Sync derived child estimate lines from parent measurements × derivation rules.
 */
import { deriveLinked } from "@esti/contracts";
import { defaultMeasurementTemplate } from "./measurement.js";
import type { WorkItem } from "./model.js";
import { newId } from "./model.js";
import type { RateBookIndex } from "./rateBookIndex.js";
import { itemQty } from "./itemQty.js";

/** Rebuild auto-derived children; manual (non-derived) parent lines are kept. */
export function syncDerivedItems(items: WorkItem[], index: RateBookIndex | null): WorkItem[] {
  if (!index) return items;

  const parents = items.filter((it) => !it.derivedFrom);
  const aggQty = new Map<string, { qty: number; from: string }>();

  for (const parent of parents) {
    const rate = index.rateByCode.get(parent.code);
    if (!rate?.derivations.length) continue;
    const parentQty = itemQty(parent);
    if (parentQty <= 0) continue;

    for (const line of deriveLinked(parentQty, rate.derivations)) {
      if (line.qty <= 0) continue;
      if (!index.rateByCode.has(line.childItemCode)) continue;
      const cur = aggQty.get(line.childItemCode);
      if (cur) cur.qty += line.qty;
      else aggQty.set(line.childItemCode, { qty: line.qty, from: parent.code });
    }
  }

  const derived: WorkItem[] = [];
  for (const [childCode, { qty, from }] of aggQty) {
    const childRate = index.rateByCode.get(childCode)!;
    const template = childRate.measurementTemplate ?? defaultMeasurementTemplate(childRate.uom);
    // Encode frozen qty as Nos=1, L=qty, H=1 for m²/m templates (B off).
    const measure =
      template.h.mode === "PUNCHED" && template.b.mode === "OFF"
        ? { id: newId("m"), desc: `Derived from ${from}`, nos: 1, l: qty, b: null, h: 1 }
        : { id: newId("m"), desc: `Derived from ${from}`, nos: 1, l: qty, b: 1, h: 1 };

    derived.push({
      id: newId("d"),
      code: childRate.code,
      itemCode: childRate.itemCode,
      shortName: childRate.shortName,
      specification: childRate.specification,
      uom: childRate.uom,
      ratePaise: childRate.ratePaise,
      section: index.sectionForItem(childRate),
      measurementTemplate: template,
      measurements: [measure],
      derivedFrom: from,
    });
  }

  return [...parents, ...derived];
}
