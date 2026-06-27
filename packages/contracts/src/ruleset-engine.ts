/**
 * RuleSet-driven derivation engine (deterministic, pure).
 *
 * Given a published work item (RuleSet) and the measurement values entered once
 * by the operator, this derives **everything downstream**: the primary quantity,
 * the BOQ measurable outputs (splitters), the material consumption (splitters),
 * and the full dependency chain of child work items — each child's primary
 * quantity coming from its dependency-mapping formula evaluated against the
 * variables the parent exposes. No DB, no I/O: the backend supplies the RuleSet
 * graph; this computes the numbers. See docs/esti/ESTIMATION-OS-ARCHITECTURE.md.
 *
 * Variable namespace:
 *   - The ROOT sees the operator's measurement inputs, plus the derived
 *     `quantity`, plus each BOQ-splitter output (referenced by its outputName,
 *     which must be a plain identifier to be usable downstream).
 *   - A CHILD's primary quantity is the dependency formula's result; the child
 *     then exposes `quantity` + its own BOQ-splitter outputs to its children.
 */
import type { BoqSplitter, MaterialSplitter } from "./estimation.js";
import { evaluate } from "./formula-engine.js";

export interface RuleSetNode {
  code: string;
  name: string;
  uom: string;
  /** Primary-quantity expression over the measurement-field keys. */
  quantityFormula: string;
  boqSplitters: BoqSplitter[];
  materialSplitters: MaterialSplitter[];
  /** Ordered child dependencies; each maps the parent's variables → child qty. */
  dependencies: { childCode: string; quantityFormula: string; sequence: number }[];
}

export interface DerivedBoq {
  outputName: string;
  uom: string;
  quantity: number;
}
export interface DerivedMaterial {
  materialName: string;
  uom: string;
  quantity: number;
}
export interface DerivedItem {
  code: string;
  name: string;
  uom: string;
  quantity: number;
  boq: DerivedBoq[];
  materials: DerivedMaterial[];
  children: DerivedItem[];
}

function deriveNode(
  node: RuleSetNode,
  quantity: number,
  baseVars: Record<string, number>,
  registry: Map<string, RuleSetNode>,
  seen: Set<string>,
): DerivedItem {
  const splitVars: Record<string, number> = { ...baseVars, quantity };

  const boq: DerivedBoq[] = node.boqSplitters.map((s) => ({
    outputName: s.outputName,
    uom: s.uom,
    quantity: evaluate(s.formula, splitVars),
  }));
  const materials: DerivedMaterial[] = node.materialSplitters.map((s) => ({
    materialName: s.materialName,
    uom: s.uom,
    quantity: evaluate(s.formula, splitVars),
  }));

  // Children reference the parent's quantity + its (identifier-named) BOQ outputs.
  const childVars: Record<string, number> = { ...splitVars };
  for (const b of boq) childVars[b.outputName] = b.quantity;

  const children: DerivedItem[] = [...node.dependencies]
    .sort((a, b) => a.sequence - b.sequence)
    .map((dep) => {
      const child = registry.get(dep.childCode);
      if (!child) throw new Error(`Unknown dependency '${dep.childCode}'`);
      if (seen.has(child.code)) throw new Error(`Cyclic dependency at '${child.code}'`);
      const childQty = evaluate(dep.quantityFormula, childVars);
      // A child reached via a dependency has no operator inputs of its own — its
      // variable namespace is just its derived quantity.
      return deriveNode(child, childQty, {}, registry, new Set([...seen, child.code]));
    });

  return { code: node.code, name: node.name, uom: node.uom, quantity, boq, materials, children };
}

/**
 * Derive a full estimate tree from a root RuleSet + the operator's measurement
 * values. `registry` resolves dependency child codes (the backend loads the
 * published RuleSet graph). Throws on a missing dependency, a cycle, or any bad
 * formula / missing input.
 */
export function deriveRuleSet(
  rootCode: string,
  params: Record<string, number>,
  registry: Map<string, RuleSetNode>,
): DerivedItem {
  const root = registry.get(rootCode);
  if (!root) throw new Error(`Unknown RuleSet '${rootCode}'`);
  const quantity = evaluate(root.quantityFormula, params);
  return deriveNode(root, quantity, params, registry, new Set([rootCode]));
}

/** Flatten every material line across a derived tree (parent + all descendants). */
export function collectMaterials(node: DerivedItem): DerivedMaterial[] {
  const out: DerivedMaterial[] = [...node.materials];
  for (const c of node.children) out.push(...collectMaterials(c));
  return out;
}

/** Sum material lines by (materialName, uom) — the procurement-facing rollup. */
export function aggregateMaterials(mats: DerivedMaterial[]): DerivedMaterial[] {
  const map = new Map<string, DerivedMaterial>();
  for (const m of mats) {
    const key = `${m.materialName}|${m.uom}`;
    const cur = map.get(key);
    if (cur) cur.quantity = Number((cur.quantity + m.quantity).toFixed(4));
    else map.set(key, { ...m });
  }
  return [...map.values()];
}
