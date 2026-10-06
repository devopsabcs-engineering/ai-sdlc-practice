export const supportedUnits = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "oz",
  "lb",
  "fl oz",
] as const;

export type SupportedUnit = (typeof supportedUnits)[number];

export type IngredientLine =
  | {
      kind: "parsed";
      original: string;
      quantity: number;
      unit: SupportedUnit | null;
      name: string;
    }
  | { kind: "unparsed"; original: string };

const unitAliases: Readonly<Record<string, SupportedUnit>> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  "fl oz": "fl oz",
  "fl ounce": "fl oz",
  "fl ounces": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  "us fl oz": "fl oz",
  "us fluid ounce": "fl oz",
  "us fluid ounces": "fl oz",
};

const unitAliasEntries = Object.entries(unitAliases).sort(
  ([left], [right]) => right.length - left.length,
);

interface QuantityMatch {
  amount: number;
  length: number;
}

function readQuantity(input: string): QuantityMatch | null {
  const mixed = /^(\d+)\s+(\d+)\/(\d+)(?=\s|$)/.exec(input);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator === 0 || numerator >= denominator) return null;
    return { amount: whole + numerator / denominator, length: mixed[0].length };
  }

  const fraction = /^(\d+)\/(\d+)(?=\s|$)/.exec(input);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return { amount: numerator / denominator, length: fraction[0].length };
  }

  const decimal = /^(?:\d+(?:\.\d+)?|\.\d+)(?=\s|$)/.exec(input);
  if (!decimal) return null;
  return { amount: Number(decimal[0]), length: decimal[0].length };
}

export function parseIngredientLine(original: string): IngredientLine {
  const input = original.trim();
  const quantity = readQuantity(input);
  if (!quantity || !Number.isFinite(quantity.amount) || quantity.amount <= 0) {
    return { kind: "unparsed", original };
  }

  const remainder = input.slice(quantity.length).trim();
  if (!remainder) return { kind: "unparsed", original };

  const normalizedRemainder = remainder.toLocaleLowerCase("en-US");
  const alias = unitAliasEntries.find(([candidate]) => {
    if (!normalizedRemainder.startsWith(candidate)) return false;
    const boundary = normalizedRemainder[candidate.length];
    return boundary === undefined || /[\s,.]/.test(boundary);
  });
  const unit = alias?.[1] ?? null;
  const name = unit
    ? remainder
        .slice(alias![0].length)
        .replace(/^[.,]\s*/, "")
        .trim()
    : remainder;
  if (!name) return { kind: "unparsed", original };

  return { kind: "parsed", original, quantity: quantity.amount, unit, name };
}
