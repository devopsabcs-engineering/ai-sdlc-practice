import type { ShoppingItem, LocalizedText } from "./library.ts";
import type { SupportedUnit } from "./ingredient.ts";
import {
  convertQuantity,
  getUnitDimension,
  getUnitSystem,
  selectDisplayUnit,
  toCanonicalQuantity,
} from "./unit-conversion.ts";

export interface ShoppingCandidate {
  name: LocalizedText;
  quantity: number | null;
  unit: SupportedUnit | null;
  canonicalDimension: ShoppingItem["canonicalDimension"];
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function hasSameName(left: LocalizedText, right: LocalizedText): boolean {
  return (
    normalize(left.en) === normalize(right.en) ||
    normalize(left.fr) === normalize(right.fr)
  );
}

function mergeQuantity(
  current: ShoppingItem,
  candidate: ShoppingCandidate,
): Pick<ShoppingItem, "quantity" | "unit"> {
  if (
    current.quantity === null ||
    candidate.quantity === null ||
    current.canonicalDimension === "unknown"
  ) {
    return { quantity: current.quantity, unit: current.unit };
  }
  if (current.canonicalDimension === "count") {
    return { quantity: current.quantity + candidate.quantity, unit: null };
  }

  const currentUnit = current.unit;
  const candidateUnit = candidate.unit;
  if (!currentUnit || !candidateUnit) {
    return { quantity: current.quantity, unit: current.unit };
  }
  const canonical =
    toCanonicalQuantity(current.quantity, currentUnit) +
    toCanonicalQuantity(candidate.quantity, candidateUnit);
  const displayUnit = selectDisplayUnit(
    canonical,
    getUnitDimension(candidateUnit),
    getUnitSystem(candidateUnit),
  );
  return convertQuantity(
    canonical,
    current.canonicalDimension === "mass" ? "g" : "ml",
    displayUnit,
  );
}

export function addShoppingCandidates(
  items: readonly ShoppingItem[],
  candidates: readonly ShoppingCandidate[],
  createId: () => string,
): ShoppingItem[] {
  const next = items.map((item) => ({ ...item, name: { ...item.name } }));
  for (const candidate of candidates) {
    const mergeIndex =
      candidate.canonicalDimension === "unknown"
        ? -1
        : next.findIndex(
            (item) =>
              item.canonicalDimension === candidate.canonicalDimension &&
              hasSameName(item.name, candidate.name),
          );
    if (mergeIndex >= 0) {
      const existing = next[mergeIndex]!;
      next[mergeIndex] = {
        ...existing,
        ...mergeQuantity(existing, candidate),
      };
      continue;
    }
    next.push({
      id: createId(),
      name: { ...candidate.name },
      quantity: candidate.quantity,
      unit: candidate.unit,
      canonicalDimension: candidate.canonicalDimension,
      checked: false,
    });
  }
  return next;
}
