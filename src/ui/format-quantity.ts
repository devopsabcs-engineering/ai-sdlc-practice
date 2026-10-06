import type { SupportedUnit } from "../domain/ingredient.ts";

const fractionGlyphs = new Map([
  ["1/8", "⅛"],
  ["1/4", "¼"],
  ["1/3", "⅓"],
  ["1/2", "½"],
  ["2/3", "⅔"],
  ["3/4", "¾"],
]);

const practicalRoundUnits = new Set<SupportedUnit>(["g", "ml"]);

export function formatQuantity(
  value: number,
  unit: SupportedUnit | null,
  locale = "en",
): string {
  const roundedValue =
    practicalRoundUnits.has(unit as SupportedUnit) && value >= 10
      ? Math.round(value)
      : value;
  const whole = Math.floor(roundedValue);
  const remainder = roundedValue - whole;

  if (!practicalRoundUnits.has(unit as SupportedUnit)) {
    let closest: { text: string; difference: number } | undefined;
    for (const [fraction, glyph] of fractionGlyphs) {
      const [numerator, denominator] = fraction.split("/").map(Number);
      const fractionValue = numerator! / denominator!;
      const difference = Math.abs(remainder - fractionValue);
      if (!closest || difference < closest.difference)
        closest = { text: glyph, difference };
    }
    if (closest && closest.difference <= 0.02) {
      return `${whole > 0 ? `${whole} ` : ""}${closest.text}`;
    }
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    roundedValue,
  );
}
