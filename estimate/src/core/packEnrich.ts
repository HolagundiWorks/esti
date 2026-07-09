/**
 * Enrich CPWD pack with derivation rules and supplemental material recipes
 * not present in the cement-coefficient table alone.
 */
import type {
  DerivationRule,
  RateLibraryMaterial,
  RateLibraryPack,
  RateLibraryRateItem,
  RateLibraryRecipe,
} from "@esti/contracts";

const PLASTER_12_1_4 = "13.1.1";

function ensureMaterial(
  materials: RateLibraryMaterial[],
  code: string,
  name: string,
  unit: string,
): void {
  if (!materials.some((m) => m.code === code)) {
    materials.push({ code, name, unit });
  }
}

function isBrickWork(rate: RateLibraryRateItem): boolean {
  const hay = `${rate.shortName} ${rate.specification ?? ""}`.toLowerCase();
  return (
    rate.code.startsWith("6.") &&
    (rate.uom === "m³" || rate.uom === "m²" || rate.uom === "cum" || rate.uom === "sqm") &&
    hay.includes("brick")
  );
}

function isMasonryWall(rate: RateLibraryRateItem): boolean {
  return isBrickWork(rate) || (rate.code.startsWith("6.") && rate.uom === "m²");
}

function inferDerivations(rate: RateLibraryRateItem): DerivationRule[] {
  if (rate.derivations.length > 0) return [];
  if (!isMasonryWall(rate)) return [];
  return [{ childItemCode: PLASTER_12_1_4, rule: "FACTOR", factor: 2 }];
}

/** Mortar mix cement + sand per 1 m³ (quintal / cum) — CPWD typical consumption. */
function mortarRecipes(rate: RateLibraryRateItem): RateLibraryRecipe[] {
  const mix = rate.attributes.mix ?? "";
  if (!rate.code.startsWith("6.") || rate.uom !== "m³") return [];
  if (!mix.includes(":")) return [];
  const recipes: RateLibraryRecipe[] = [];
  if (mix.includes("1:4")) {
    recipes.push({ rateItemCode: rate.code, materialCode: "cement", coefficient: 3.74, wastagePct: 2 });
    recipes.push({ rateItemCode: rate.code, materialCode: "coarse-sand", coefficient: 1.05, wastagePct: 5 });
  } else if (mix.includes("1:6")) {
    recipes.push({ rateItemCode: rate.code, materialCode: "cement", coefficient: 2.88, wastagePct: 2 });
    recipes.push({ rateItemCode: rate.code, materialCode: "coarse-sand", coefficient: 1.08, wastagePct: 5 });
  } else if (mix.includes("1:3")) {
    recipes.push({ rateItemCode: rate.code, materialCode: "cement", coefficient: 4.9, wastagePct: 2 });
    recipes.push({ rateItemCode: rate.code, materialCode: "coarse-sand", coefficient: 0.95, wastagePct: 5 });
  }
  return recipes;
}

function brickRecipes(rate: RateLibraryRateItem): RateLibraryRecipe[] {
  if (!isBrickWork(rate) || rate.uom !== "m³") return [];
  return [
    { rateItemCode: rate.code, materialCode: "bricks-modular", coefficient: 0.5, wastagePct: 2.5 },
    { rateItemCode: rate.code, materialCode: "cement", coefficient: 1.2, wastagePct: 2 },
    { rateItemCode: rate.code, materialCode: "coarse-sand", coefficient: 0.45, wastagePct: 5 },
  ];
}

function plasterRecipes(rate: RateLibraryRateItem): RateLibraryRecipe[] {
  if (!rate.code.startsWith("13.") || rate.uom !== "m²") return [];
  const mix = rate.attributes.mix ?? rate.specification ?? "";
  if (!mix.includes(":")) return [];
  if (mix.includes("1:4")) {
    return [
      { rateItemCode: rate.code, materialCode: "cement", coefficient: 0.086, wastagePct: 2 },
      { rateItemCode: rate.code, materialCode: "fine-sand", coefficient: 0.06, wastagePct: 5 },
    ];
  }
  if (mix.includes("1:6")) {
    return [
      { rateItemCode: rate.code, materialCode: "cement", coefficient: 0.06, wastagePct: 2 },
      { rateItemCode: rate.code, materialCode: "fine-sand", coefficient: 0.09, wastagePct: 5 },
    ];
  }
  return [];
}

function inferRecipes(rate: RateLibraryRateItem, existing: Set<string>): RateLibraryRecipe[] {
  const candidates = [...mortarRecipes(rate), ...brickRecipes(rate), ...plasterRecipes(rate)];
  return candidates.filter((r) => {
    const key = `${r.rateItemCode}::${r.materialCode}`;
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
}

/** Return an enriched copy of the pack (derivations + recipes + materials). */
export function enrichRateBookPack(pack: RateLibraryPack): RateLibraryPack {
  const materials = [...pack.materials];
  ensureMaterial(materials, "coarse-sand", "Coarse sand", "m³");
  ensureMaterial(materials, "fine-sand", "Fine sand", "m³");
  ensureMaterial(materials, "bricks-modular", "Modular bricks", "1000 Nos");

  const recipeKeys = new Set(pack.recipes.map((r) => `${r.rateItemCode}::${r.materialCode}`));
  const extraRecipes: RateLibraryRecipe[] = [];

  const rateItems = pack.rateItems.map((rate) => {
    const derivations = [...rate.derivations, ...inferDerivations(rate)];
    extraRecipes.push(...inferRecipes(rate, recipeKeys));
    return derivations.length > rate.derivations.length ? { ...rate, derivations } : rate;
  });

  return {
    ...pack,
    materials,
    recipes: [...pack.recipes, ...extraRecipes],
    rateItems,
  };
}
