import type { SupportedUnit } from "./ingredient.ts";

export type UnitSystem = "metric" | "imperial";
export type UnitDimension = "mass" | "volume";

interface UnitDefinition {
  dimension: UnitDimension;
  system: UnitSystem;
  canonicalFactor: number;
}

const units: Readonly<Record<SupportedUnit, UnitDefinition>> = {
  g: { dimension: "mass", system: "metric", canonicalFactor: 1 },
  kg: { dimension: "mass", system: "metric", canonicalFactor: 1000 },
  oz: {
    dimension: "mass",
    system: "imperial",
    canonicalFactor: 28.349523125,
  },
  lb: {
    dimension: "mass",
    system: "imperial",
    canonicalFactor: 453.59237,
  },
  ml: { dimension: "volume", system: "metric", canonicalFactor: 1 },
  l: { dimension: "volume", system: "metric", canonicalFactor: 1000 },
  tsp: {
    dimension: "volume",
    system: "imperial",
    canonicalFactor: 4.92892159375,
  },
  tbsp: {
    dimension: "volume",
    system: "imperial",
    canonicalFactor: 14.78676478125,
  },
  "fl oz": {
    dimension: "volume",
    system: "imperial",
    canonicalFactor: 29.5735295625,
  },
  cup: {
    dimension: "volume",
    system: "imperial",
    canonicalFactor: 236.5882365,
  },
};

export function getUnitDimension(unit: SupportedUnit): UnitDimension {
  return units[unit].dimension;
}

export function getUnitSystem(unit: SupportedUnit): UnitSystem {
  return units[unit].system;
}

export function toCanonicalQuantity(
  quantity: number,
  unit: SupportedUnit,
): number {
  return quantity * units[unit].canonicalFactor;
}

export interface DisplayQuantity {
  quantity: number;
  unit: SupportedUnit | null;
}

export function convertQuantity(
  quantity: number,
  sourceUnit: SupportedUnit | null,
  targetUnit: SupportedUnit | null,
): DisplayQuantity {
  if (!sourceUnit || !targetUnit) return { quantity, unit: sourceUnit };
  const source = units[sourceUnit];
  const target = units[targetUnit];
  if (source.dimension !== target.dimension) {
    return { quantity, unit: sourceUnit };
  }
  return {
    quantity: (quantity * source.canonicalFactor) / target.canonicalFactor,
    unit: targetUnit,
  };
}

export function selectDisplayUnit(
  canonicalQuantity: number,
  dimension: UnitDimension,
  system: UnitSystem,
): SupportedUnit {
  if (dimension === "mass") {
    if (system === "metric") return canonicalQuantity >= 1000 ? "kg" : "g";
    return canonicalQuantity >= units.lb.canonicalFactor ? "lb" : "oz";
  }

  if (system === "metric") return canonicalQuantity >= 1000 ? "l" : "ml";
  if (canonicalQuantity >= units.cup.canonicalFactor) return "cup";
  if (canonicalQuantity >= units["fl oz"].canonicalFactor) return "fl oz";
  if (canonicalQuantity >= units.tbsp.canonicalFactor) return "tbsp";
  return "tsp";
}

export function convertToUnitSystem(
  quantity: number,
  sourceUnit: SupportedUnit | null,
  targetSystem: UnitSystem,
): DisplayQuantity {
  if (!sourceUnit) return { quantity, unit: null };
  const source = units[sourceUnit];
  const canonicalQuantity = quantity * source.canonicalFactor;
  const targetUnit = selectDisplayUnit(
    canonicalQuantity,
    source.dimension,
    targetSystem,
  );
  return convertQuantity(quantity, sourceUnit, targetUnit);
}
