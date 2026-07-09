import { measureQtyFromTemplate } from "./measurement.js";
import type { WorkItem } from "./model.js";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Sum measurement rows for one work item (template-aware). */
export function itemQty(item: WorkItem): number {
  const template = item.measurementTemplate;
  if (!template) {
    return round3(
      item.measurements.reduce(
        (s, m) => s + measureQtyFromTemplate(m, {
          nos: { mode: "PUNCHED" },
          l: { mode: "PUNCHED" },
          b: { mode: "PUNCHED" },
          h: { mode: "PUNCHED" },
        }),
        0,
      ),
    );
  }
  return round3(
    item.measurements.reduce((s, m) => s + measureQtyFromTemplate(m, template), 0),
  );
}
